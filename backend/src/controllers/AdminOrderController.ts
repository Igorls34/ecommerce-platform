import { OrderStatus, Prisma } from '@prisma/client';
import { Request, Response } from 'express';

import { prisma } from '../lib/prisma';
import { EmailService } from '../services/EmailService';
import {
  MelhorEnvioApiError,
  MelhorEnvioLabelService,
} from '../services/MelhorEnvioLabelService';
import { markOrderPaid } from '../services/OrderPaymentService';

const emailService = new EmailService();
const melhorEnvioLabelService = new MelhorEnvioLabelService();
const LABEL_CREATION_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PREPARING,
  OrderStatus.PACKED,
];
const LABEL_OPERATION_STATUSES: OrderStatus[] = [
  ...LABEL_CREATION_STATUSES,
  OrderStatus.LABEL_GENERATED,
  OrderStatus.POSTED,
  OrderStatus.SHIPPED,
];
const PAYMENT_CONFIRMED_STATUSES = new Set<string>([
  OrderStatus.PAID,
  OrderStatus.PREPARING,
  OrderStatus.PACKED,
  OrderStatus.LABEL_GENERATED,
  OrderStatus.POSTED,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
  'PAID_STOCK_ISSUE',
]);

function isOrderStatus(value: string): value is OrderStatus {
  return Object.values(OrderStatus).includes(value as OrderStatus);
}

function formatMelhorEnvioError(error: unknown) {
  if (error instanceof MelhorEnvioApiError) {
    return {
      error: error.message,
      code: error.code,
      details: error.details,
    };
  }

  return {
    error: error instanceof Error ? error.message : 'Erro ao processar etiqueta.',
    code: 'MELHOR_ENVIO_API',
  };
}

function canCreateShippingLabel(status: OrderStatus) {
  return LABEL_CREATION_STATUSES.includes(status);
}

function canOperateShippingLabel(status: OrderStatus) {
  return LABEL_OPERATION_STATUSES.includes(status);
}

async function fetchOrderForAdmin(id: number) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      items: {
        include: {
          variant: true,
          product: {
            include: {
              category: true,
            },
          },
        },
      },
    },
  });
}

function buildOrderWhereClause(query: Request['query']): Prisma.OrderWhereInput {
  const search = String(query.search || '').trim();
  const requestedStatus = String(query.status || '')
    .trim()
    .toUpperCase();
  const status = isOrderStatus(requestedStatus) ? requestedStatus : undefined;
  const statusGroup = String(query.statusGroup || '').trim();

  return {
    ...(statusGroup === 'ready'
      ? { status: { in: [OrderStatus.PAID, 'PAID_STOCK_ISSUE' as OrderStatus, OrderStatus.PREPARING, OrderStatus.PACKED, OrderStatus.LABEL_GENERATED] } }
      : status
        ? { status }
        : {}),
    ...(search
      ? {
          OR: [
            {
              customer: {
                name: {
                  contains: search,
                },
              },
            },
            {
              customer: {
                email: {
                  contains: search,
                },
              },
            },
          ],
        }
      : {}),
  };
}

function getPagination(query: Request['query']) {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit || 20)));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

export const getAdminOrders = async (req: Request, res: Response) => {
  try {
    const where = buildOrderWhereClause(req.query);
    const shouldPaginate = Boolean(req.query.page || req.query.limit || req.query.paginated);
    const pagination = getPagination(req.query);
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        ...(shouldPaginate ? { skip: pagination.skip, take: pagination.limit } : {}),
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          items: {
            include: {
              variant: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  imageUrl: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      shouldPaginate ? prisma.order.count({ where }) : Promise.resolve(0),
    ]);

    if (shouldPaginate) {
      return res.status(200).json({
        items: orders,
        meta: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / pagination.limit)),
        },
      });
    }

    return res.status(200).json(orders);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao listar os pedidos.' });
  }
};

export const getAdminOrderById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID do pedido inválido.' });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true,
            lastLoginAt: true,
          },
        },
        fiscalDocuments: {
          orderBy: { createdAt: 'desc' },
        },
        items: {
          include: {
            variant: true,
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                category: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }

    return res.status(200).json(order);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao carregar o pedido.' });
  }
};

export const updateAdminOrderStatus = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const requestedStatus = String(req.body.status || '')
      .trim()
      .toUpperCase();

    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID do pedido inválido.' });
    }

    if (!isOrderStatus(requestedStatus)) {
      return res.status(400).json({ error: 'Status do pedido inválido.' });
    }

    if (requestedStatus === OrderStatus.PAID) {
      const previousOrder = await prisma.order.findUnique({
        where: { id },
        select: { status: true },
      });
      const order = await markOrderPaid(id);

      if (!order) {
        return res.status(404).json({ error: 'Pedido não encontrado.' });
      }

      const hydratedOrder = await fetchOrderForAdmin(id);
      if (
        hydratedOrder &&
        !PAYMENT_CONFIRMED_STATUSES.has(String(previousOrder?.status)) &&
        PAYMENT_CONFIRMED_STATUSES.has(String(hydratedOrder.status))
      ) {
        emailService.sendOrderConfirmation(hydratedOrder);
        emailService.sendPaymentConfirmedToAdmin(hydratedOrder);
      }

      return res.status(200).json(hydratedOrder || order);
    }

    const existingOrder = await prisma.order
      .findUnique({
        where: { id },
        select: {
          trackingCode: true,
        },
      })
      .catch(() => null);

    const now = new Date();
    const nextTrackingCode = req.body.trackingCode || null;
    const order = await prisma.order.update({
      where: { id },
      data: {
        status: requestedStatus,
        trackingCode: nextTrackingCode,
        shippingNotes: req.body.shippingNotes || null,
        ...(requestedStatus === OrderStatus.SHIPPED ? { shippedAt: now } : {}),
        ...(requestedStatus === OrderStatus.POSTED ? { shippedAt: now } : {}),
        ...(requestedStatus === OrderStatus.DELIVERED ? { deliveredAt: now } : {}),
      },
      include: {
        customer: true,
        items: {
          include: {
            variant: true,
            product: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    emailService.sendOrderStatusUpdate(order);
    if (nextTrackingCode && nextTrackingCode !== existingOrder?.trackingCode) {
      emailService.sendTrackingCodeToCustomer(order);
    }

    return res.status(200).json(order);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao atualizar o pedido.' });
  }
};

export const confirmAdminOrderPayment = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID do pedido inválido.' });
    }

    const previousOrder = await prisma.order.findUnique({
      where: { id },
      select: { status: true },
    });
    const order = await markOrderPaid(id);

    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }

    const hydratedOrder = await fetchOrderForAdmin(id);
    if (
      hydratedOrder &&
      !PAYMENT_CONFIRMED_STATUSES.has(String(previousOrder?.status)) &&
      PAYMENT_CONFIRMED_STATUSES.has(String(hydratedOrder.status))
    ) {
      emailService.sendOrderConfirmation(hydratedOrder);
      emailService.sendPaymentConfirmedToAdmin(hydratedOrder);
    }

    return res.status(200).json(hydratedOrder || order);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao confirmar pagamento do pedido.' });
  }
};

export const updateAdminOrderDetails = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID do pedido inválido.' });
    }

    const existingOrder = await prisma.order.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }

    if ((existingOrder as any).melhorEnvioOrderId) {
      return res
        .status(409)
        .json({ error: 'Não altere endereço depois que a etiqueta já foi criada.' });
    }

    const serviceId = req.body.melhorEnvioServiceId
      ? Number(req.body.melhorEnvioServiceId)
      : null;

    if (req.body.melhorEnvioServiceId && (!serviceId || Number.isNaN(serviceId))) {
      return res.status(400).json({ error: 'Serviço do Melhor Envio inválido.' });
    }

    const order = await prisma.order.update({
      where: { id },
      data: {
        orderNotes: req.body.orderNotes || '',
        shippingNotes: req.body.shippingNotes || null,
        shippingAddress: req.body.shippingAddress || null,
        melhorEnvioServiceId: serviceId,
      } as any,
      include: {
        customer: true,
        items: {
          include: {
            variant: true,
            product: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    return res.status(200).json(order);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Erro ao atualizar dados do pedido.';
    return res.status(500).json({ error: message });
  }
};

export const createAdminOrderShippingLabel = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const agency = req.body.agency ? Number(req.body.agency) : undefined;

    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID do pedido inválido.' });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            variant: true,
            product: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }

    const serviceId = Number(
      req.body.serviceId ||
        (order as any).melhorEnvioServiceId ||
        process.env.MELHOR_ENVIO_DEFAULT_SERVICE_ID,
    );

    if (!serviceId || Number.isNaN(serviceId)) {
      return res.status(400).json({ error: 'Informe o serviço do Melhor Envio.' });
    }

    if (!canCreateShippingLabel(order.status)) {
      return res
        .status(400)
        .json({ error: 'A etiqueta só pode ser gerada depois que o pedido estiver pago.' });
    }

    if ((order as any).melhorEnvioOrderId) {
      return res.status(409).json({ error: 'Este pedido já possui etiqueta do Melhor Envio.' });
    }

    const shipment = await melhorEnvioLabelService.addShipmentToCart({
      serviceId,
      agency,
      order: order as any,
    });

    const melhorEnvioOrderId = shipment.id;

    if (!melhorEnvioOrderId) {
      return res.status(502).json({ error: 'Melhor Envio não retornou ID da etiqueta.' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        melhorEnvioOrderId,
        melhorEnvioProtocol: shipment.protocol || null,
        melhorEnvioStatus: shipment.status || 'cart',
        melhorEnvioServiceId: serviceId,
      } as any,
      include: {
        customer: true,
        items: {
          include: {
            variant: true,
            product: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    return res.status(201).json(updatedOrder);
  } catch (error) {
    console.error(error);
    return res.status(400).json(formatMelhorEnvioError(error));
  }
};

export const createFullAdminOrderShippingLabel = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const agency = req.body.agency ? Number(req.body.agency) : undefined;

    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID do pedido inválido.' });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            variant: true,
            product: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }

    if (!canCreateShippingLabel(order.status) && !(order as any).melhorEnvioOrderId) {
      return res
        .status(400)
        .json({ error: 'A etiqueta só pode ser gerada depois que o pedido estiver pago.' });
    }

    const serviceId = Number(
      req.body.serviceId ||
        (order as any).melhorEnvioServiceId ||
        process.env.MELHOR_ENVIO_DEFAULT_SERVICE_ID,
    );

    if (!serviceId || Number.isNaN(serviceId)) {
      return res.status(400).json({ error: 'Informe o serviço do Melhor Envio.' });
    }

    let melhorEnvioOrderId = (order as any).melhorEnvioOrderId || '';

    if (!melhorEnvioOrderId) {
      const shipment = await melhorEnvioLabelService.addShipmentToCart({
        serviceId,
        agency,
        order: order as any,
      });

      melhorEnvioOrderId = shipment.id || '';

      if (!melhorEnvioOrderId) {
        return res.status(502).json({ error: 'Melhor Envio não retornou ID da etiqueta.' });
      }

      await prisma.order.update({
        where: { id },
        data: {
          melhorEnvioOrderId,
          melhorEnvioProtocol: shipment.protocol || null,
          melhorEnvioStatus: shipment.status || 'cart',
          melhorEnvioServiceId: serviceId,
        } as any,
      });
    }

    await melhorEnvioLabelService.checkoutShipment(melhorEnvioOrderId);
    await prisma.order.update({
      where: { id },
      data: { melhorEnvioStatus: 'checkout_requested' } as any,
    });

    const generateData = await melhorEnvioLabelService.generateShipment(melhorEnvioOrderId);
    await prisma.order.update({
      where: { id },
      data: { melhorEnvioStatus: 'generated_waiting_print' } as any,
    });
    const printableLabel = await melhorEnvioLabelService.waitForPrintableLabel(melhorEnvioOrderId);
    const labelUrl = printableLabel.labelUrl;
    const trackingCode = melhorEnvioLabelService.extractTrackingCode(
      generateData,
      printableLabel.printData,
      printableLabel.trackingData,
      printableLabel.searchData,
    );

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        melhorEnvioLabelUrl: labelUrl,
        melhorEnvioStatus: 'print_available',
        status: canCreateShippingLabel(order.status) ? OrderStatus.LABEL_GENERATED : order.status,
        ...(trackingCode ? { trackingCode } : {}),
      } as any,
      include: {
        customer: true,
        items: {
          include: {
            variant: true,
            product: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    if (trackingCode && trackingCode !== order.trackingCode) {
      emailService.sendTrackingCodeToCustomer(updatedOrder);
    }

    return res.status(200).json(updatedOrder);
  } catch (error) {
    console.error(error);
    return res.status(400).json(formatMelhorEnvioError(error));
  }
};

export const checkoutAdminOrderShippingLabel = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID do pedido inválido.' });
    }

    const order = await prisma.order.findUnique({ where: { id } });
    const melhorEnvioOrderId = (order as any)?.melhorEnvioOrderId;

    if (!order || !melhorEnvioOrderId) {
      return res.status(404).json({ error: 'Etiqueta não encontrada para este pedido.' });
    }

    if (!canOperateShippingLabel(order.status)) {
      return res
        .status(400)
        .json({ error: 'Esta etiqueta não pode ser processada no status atual do pedido.' });
    }

    await melhorEnvioLabelService.checkoutShipment(melhorEnvioOrderId);

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { melhorEnvioStatus: 'checkout_requested' } as any,
    });

    return res.status(200).json(updatedOrder);
  } catch (error) {
    console.error(error);
    return res.status(400).json(formatMelhorEnvioError(error));
  }
};

export const generateAdminOrderShippingLabel = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID do pedido inválido.' });
    }

    const order = await prisma.order.findUnique({ where: { id } });
    const melhorEnvioOrderId = (order as any)?.melhorEnvioOrderId;

    if (!order || !melhorEnvioOrderId) {
      return res.status(404).json({ error: 'Etiqueta não encontrada para este pedido.' });
    }

    if (!canOperateShippingLabel(order.status)) {
      return res
        .status(400)
        .json({ error: 'Esta etiqueta não pode ser processada no status atual do pedido.' });
    }

    const generateData = await melhorEnvioLabelService.generateShipment(melhorEnvioOrderId);
    const trackingCode = melhorEnvioLabelService.extractTrackingCode(generateData);

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        melhorEnvioStatus: 'generated',
        ...(trackingCode ? { trackingCode } : {}),
      } as any,
      include: {
        customer: true,
        items: {
          include: {
            variant: true,
            product: true,
          },
        },
      },
    });

    if (trackingCode && trackingCode !== order.trackingCode) {
      emailService.sendTrackingCodeToCustomer(updatedOrder);
    }

    return res.status(200).json(updatedOrder);
  } catch (error) {
    console.error(error);
    return res.status(400).json(formatMelhorEnvioError(error));
  }
};

export const printAdminOrderShippingLabel = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID do pedido inválido.' });
    }

    const order = await prisma.order.findUnique({ where: { id } });
    const melhorEnvioOrderId = (order as any)?.melhorEnvioOrderId;

    if (!order || !melhorEnvioOrderId) {
      return res.status(404).json({ error: 'Etiqueta não encontrada para este pedido.' });
    }

    if (!canOperateShippingLabel(order.status)) {
      return res
        .status(400)
        .json({ error: 'Esta etiqueta não pode ser processada no status atual do pedido.' });
    }

    const printableLabel = await melhorEnvioLabelService.waitForPrintableLabel(melhorEnvioOrderId);
    const labelUrl = printableLabel.labelUrl;
    const trackingCode = melhorEnvioLabelService.extractTrackingCode(
      printableLabel.printData,
      printableLabel.trackingData,
      printableLabel.searchData,
    );

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        melhorEnvioLabelUrl: labelUrl,
        melhorEnvioStatus: 'print_available',
        status: canCreateShippingLabel(order.status) ? OrderStatus.LABEL_GENERATED : order.status,
        ...(trackingCode ? { trackingCode } : {}),
      } as any,
      include: {
        customer: true,
        items: {
          include: {
            variant: true,
            product: true,
          },
        },
      },
    });

    if (trackingCode && trackingCode !== order.trackingCode) {
      emailService.sendTrackingCodeToCustomer(updatedOrder);
    }

    return res.status(200).json(updatedOrder);
  } catch (error) {
    console.error(error);
    return res.status(400).json(formatMelhorEnvioError(error));
  }
};
