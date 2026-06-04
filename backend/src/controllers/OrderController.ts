import { OrderStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

import { prisma } from '../lib/prisma';
import { EmailService } from '../services/EmailService';
import { markOrderPaid } from '../services/OrderPaymentService';
import { PaymentService } from '../services/PaymentService';
import { encryptCpf } from '../services/SensitiveDataService';
import { ShippingService, ShippingOption } from '../services/ShippingService';
import { resolveCfop } from '../services/CfopResolver';

type OrderRequestItem = {
  productId: number;
  variantId?: number | null;
  quantity: number;
};

const PIX_DISCOUNT_RATE = 0.05;
const SHIPPING_PRICE_TOLERANCE = 0.01;
const paymentService = new PaymentService();
const emailService = new EmailService();
const shippingService = new ShippingService();

function getCustomerIdFromRequest(req: Request) {
  // A loja usa JWT de cliente separado do JWT administrativo.
  // Apenas tokens com role customer podem criar/consultar pedidos da loja.
  const authorization = req.headers.authorization || '';
  const [, token] = authorization.split(' ');

  if (!token) {
    return null;
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET não configurado para verificacao de token.');
      return null;
    }
    const payload = jwt.verify(token, jwtSecret) as JwtPayload | string;

    if (typeof payload === 'string' || payload.role !== 'customer') {
      return null;
    }

    const customerId = Number(payload.sub);
    return Number.isNaN(customerId) ? null : customerId;
  } catch {
    return null;
  }
}

function normalizeOrderItems(items: unknown): OrderRequestItem[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return {
          productId: Number.NaN,
          quantity: Number.NaN,
        };
      }

      const orderItem = item as Partial<OrderRequestItem>;

      return {
        productId: Number(orderItem.productId),
        variantId:
          orderItem.variantId === undefined || orderItem.variantId === null
            ? null
            : Number(orderItem.variantId),
        quantity: Math.floor(Number(orderItem.quantity)),
      };
    })
    .filter(
      (item) =>
        !Number.isNaN(item.productId) &&
        item.productId > 0 &&
        (item.variantId === null || !Number.isNaN(item.variantId)) &&
        item.quantity > 0,
    );
}

function normalizeSelectedShipping(value: unknown): { id: number; price?: number; deadline?: number } | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const selectedShipping = value as { id?: unknown; price?: unknown; deadline?: unknown };
  const id = Number(selectedShipping.id);

  if (!id || Number.isNaN(id)) {
    return null;
  }

  return {
    id,
    price: selectedShipping.price === undefined ? undefined : Number(selectedShipping.price),
    deadline:
      selectedShipping.deadline === undefined ? undefined : Number(selectedShipping.deadline),
  };
}

function getPaymentStatus(order: {
  status: OrderStatus | string;
  paymentStatusDetail?: string | null;
  paymentExpiresAt?: Date | null;
  paidAt?: Date | null;
}) {
  if (String(order.status) === 'PAID_STOCK_ISSUE') {
    return 'PAID_STOCK_ISSUE';
  }

  if (order.paidAt || order.status !== OrderStatus.PENDING) {
    return order.status === OrderStatus.CANCELED ? 'FAILED' : 'PAID';
  }

  if (order.paymentExpiresAt && order.paymentExpiresAt.getTime() <= Date.now()) {
    return 'EXPIRED';
  }

  if (String(order.paymentStatusDetail || '').toLowerCase().includes('failed')) {
    return 'FAILED';
  }

  return 'PENDING';
}

function buildPaymentPayload(order: any) {
  const paymentStatus = getPaymentStatus(order);
  const isPix = order.paymentMethod === 'pix';
  const canShowPix = isPix && paymentStatus === 'PENDING';
  const timeline = buildOrderTimeline(order);

  return {
    orderId: order.id,
    orderNumber: `#${order.id}`,
    paymentStatus,
    orderStatus: order.status,
    paymentMethod: order.paymentMethod || 'pix',
    amount: Number(order.total || 0),
    paymentStatusDetail: order.paymentStatusDetail || null,
    expiresAt: order.paymentExpiresAt,
    expiredAt: paymentStatus === 'EXPIRED' ? order.paymentExpiresAt : order.expiredAt,
    canRetryPayment: paymentStatus === 'PENDING',
    canGenerateNewPayment: false,
    pix: canShowPix
      ? {
          qrCode: order.paymentReference || '',
          copyPaste: order.paymentReference || '',
        }
      : null,
    card: order.paymentMethod === 'card' && paymentStatus === 'PENDING'
      ? {
          clientSecret: order.paymentReference || '',
        }
      : null,
    order,
    timeline,
    events: order.events || [],
  };
}

function buildOrderTimeline(order: any) {
  const status = String(order.status || 'PENDING');
  const paymentStatus = getPaymentStatus(order);
  const steps = [
    ['ORDER_CREATED', 'Pedido criado'],
    ['PAYMENT_PENDING', paymentStatus === 'EXPIRED' ? 'Pagamento expirado' : 'Aguardando pagamento'],
    ['PAYMENT_CONFIRMED', 'Pagamento confirmado'],
    ['PREPARING', 'Em preparação'],
    ['LABEL_GENERATED', 'Etiqueta gerada'],
    ['POSTED', 'Postado'],
    ['SHIPPED', 'Em transporte'],
    ['DELIVERED', 'Entregue'],
  ];
  const statusRank: Record<string, number> = {
    PENDING: 1,
    PAID: 3,
    PAID_STOCK_ISSUE: 3,
    PREPARING: 4,
    PACKED: 4,
    LABEL_GENERATED: 5,
    POSTED: 6,
    SHIPPED: 7,
    DELIVERED: 8,
    CANCELED: 1,
  };
  const currentRank = paymentStatus === 'EXPIRED' ? 1 : statusRank[status] || 1;

  return steps.map(([key, label], index) => ({
    key,
    label,
    state:
      paymentStatus === 'EXPIRED' && key === 'PAYMENT_PENDING'
        ? 'warning'
        : index + 1 < currentRank
          ? 'done'
          : index + 1 === currentRank
            ? 'current'
            : 'pending',
  }));
}

async function createOrderEvent(orderId: number, type: string, message: string, metadata?: unknown) {
  const orderEvent = (prisma as any).orderEvent;

  if (!orderEvent?.create) {
    return;
  }

  try {
    await orderEvent.create({
      data: {
        orderId,
        type,
        message,
        metadata: metadata || undefined,
      },
    });
  } catch (error: any) {
    if (error?.code !== 'P2021') {
      throw error;
    }
  }
}

async function saveCustomerDefaultAddress(customerId: number, address: unknown) {
  if (!address || typeof address !== 'object') {
    return;
  }

  try {
    await prisma.$executeRawUnsafe(
      'UPDATE `Customer` SET `defaultAddress` = ?, `updatedAt` = NOW(3) WHERE `id` = ?',
      JSON.stringify(address),
      customerId,
    );
  } catch {
    // O pedido nao deve falhar se apenas o cache do endereco principal nao puder ser atualizado.
  }
}

async function syncPendingStripePayment(order: any) {
  if (
    !order ||
    order.status !== OrderStatus.PENDING ||
    String(order.gatewayProvider || '').toLowerCase() !== 'stripe'
  ) {
    return order;
  }

  const gatewayPaymentId = String(order.gatewayChargeId || order.gatewayOrderId || '').trim();

  if (!gatewayPaymentId) {
    return order;
  }

  try {
    const gatewayStatus = await paymentService.getTransactionStatus(gatewayPaymentId);

    if (gatewayStatus.status === 'paid') {
      const paidOrder = await markOrderPaid(order.id);

      if (paidOrder) {
        emailService.sendOrderConfirmation(paidOrder);
        emailService.sendPaymentConfirmedToAdmin(paidOrder);
      }

      return paidOrder || order;
    }

    if (gatewayStatus.status === 'failed') {
      return prisma.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.PENDING,
          paymentStatusDetail: gatewayStatus.statusDetail || gatewayStatus.failureCode || 'failed',
        },
        include: {
          customer: true,
          events: {
            orderBy: { createdAt: 'asc' },
          } as any,
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
        } as any,
      });
    }

    if (gatewayStatus.statusDetail && gatewayStatus.statusDetail !== order.paymentStatusDetail) {
      return prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatusDetail: gatewayStatus.statusDetail,
        },
        include: {
          customer: true,
          events: {
            orderBy: { createdAt: 'asc' },
          } as any,
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
        } as any,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao consultar pagamento Stripe.';
    console.warn('[stripe-payment] consulta de status ignorada:', {
      orderId: order.id,
      message,
    });
  }

  return order;
}

export const createStoreOrder = async (req: Request, res: Response) => {
  try {
    const customerId = getCustomerIdFromRequest(req);

    if (!customerId) {
      return res.status(401).json({ error: 'Entre para finalizar o pedido.' });
    }

    const items = normalizeOrderItems(req.body.items);

    if (!items.length) {
      return res.status(400).json({ error: 'O carrinho está vazio.' });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return res.status(401).json({ error: 'Cliente não encontrado.' });
    }

    const checkoutAttemptId = String(req.body.checkoutAttemptId || req.body.clientRequestId || '')
      .trim()
      .slice(0, 64);

    if (checkoutAttemptId) {
      const existingOrder = await prisma.order.findFirst({
        where: {
          customerId,
          checkoutAttemptId,
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

      if (existingOrder) {
        return res.status(200).json({
          order: existingOrder,
          payment: buildPaymentPayload(existingOrder),
          reused: true,
        });
      }
    }

    const productIds = [...new Set(items.map((item) => item.productId))];
    const products = await prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
      include: {
        variants: true,
      },
    });

    if (products.length !== productIds.length) {
      return res
        .status(400)
        .json({ error: 'Um ou mais produtos do carrinho não foram encontrados.' });
    }

    const orderItems = items.map((item) => {
      const product = products.find((currentProduct) => currentProduct.id === item.productId);

      if (!product) {
        throw new Error('Produto não encontrado no carrinho.');
      }

      const variant = item.variantId
        ? (product as any).variants?.find(
            (currentVariant: any) =>
              Number(currentVariant.id) === Number(item.variantId) && currentVariant.active,
          )
        : null;
      const sellable = variant || product;
      const sellableName = variant ? `${product.name} - ${variant.name}` : product.name;
      const availableStock = Number(sellable.stock || 0);
      const unitPrice = Number(sellable.price || 0);

      if (item.variantId && !variant) {
        throw new Error(`Tamanho indisponivel para ${product.name}.`);
      }

      if (availableStock < item.quantity) {
        throw new Error(`Estoque insuficiente para ${sellableName}. Disponível: ${availableStock}.`);
      }

      return {
        product,
        variant,
        quantity: item.quantity,
        unitPrice,
        name: sellableName,
        subtotal: unitPrice * item.quantity,
      };
    });

    const productSubtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
    const paymentMethod = String(req.body.paymentMethod || '').trim();
    const requestCpf = req.body.customer?.cpf || '';
    const requestPhone = req.body.customer?.phone || '';
    const requestNotifyWhatsApp = Boolean(req.body.customer?.notifyWhatsApp);
    const requestPreferredContact = req.body.customer?.preferredContact || 'email';
    const hasShippingAddress = Boolean(req.body.shippingAddress?.zipCode);
    const selectedShipping = normalizeSelectedShipping(req.body.selectedShipping);
    let shippingOption: ShippingOption | null = null;

    if (hasShippingAddress) {
      if (!selectedShipping) {
        return res.status(400).json({ error: 'Escolha uma forma de entrega.' });
      }

      const shippingOptions = await shippingService.calculateShipping({
        zipCode: req.body.shippingAddress.zipCode,
        insuranceValue: productSubtotal,
      });
      shippingOption =
        shippingOptions.find((option) => Number(option.id) === Number(selectedShipping.id)) || null;

      if (!shippingOption) {
        return res
          .status(409)
          .json({
            code: 'SHIPPING_PRICE_CHANGED',
            error: 'O valor do frete foi atualizado. Revise as opções de entrega antes de continuar.',
            shippingOptions,
          });
      }

      const selectedPrice = selectedShipping.price;
      const selectedDeadline = selectedShipping.deadline;
      const shippingPriceChanged =
        selectedPrice !== undefined &&
        !Number.isNaN(selectedPrice) &&
        Math.abs(Number(shippingOption.price) - Number(selectedPrice)) > SHIPPING_PRICE_TOLERANCE;
      const shippingDeadlineChanged =
        selectedDeadline !== undefined &&
        !Number.isNaN(selectedDeadline) &&
        Number(shippingOption.deadline || 0) !== Number(selectedDeadline || 0);

      if (shippingPriceChanged || shippingDeadlineChanged) {
        return res.status(409).json({
          code: 'SHIPPING_PRICE_CHANGED',
          error: 'O valor do frete foi atualizado. Revise as opções de entrega antes de finalizar.',
          shippingOptions,
        });
      }
    }

    const shippingPrice = hasShippingAddress && shippingOption ? Number(shippingOption.price) : 0;
    const discountValue = paymentMethod === 'pix' ? productSubtotal * PIX_DISCOUNT_RATE : 0;
    const total = Math.max(0, productSubtotal + shippingPrice - discountValue);

    if (
      requestCpf ||
      requestPhone ||
      requestNotifyWhatsApp ||
      requestPreferredContact ||
      req.body.shippingAddress
    ) {
      // CPF vem limpo do checkout para ser enviado ao gateway, mas no banco so entra
      // criptografado. Se ENCRYPTION_KEY nao existir, encryptCpf retorna null.
      await prisma.customer.update({
        where: { id: customerId },
        data: {
          ...(requestCpf ? { cpf: encryptCpf(requestCpf) } : {}),
          ...(requestPhone ? { phone: requestPhone } : {}),
          ...(requestNotifyWhatsApp ? { notifyWhatsApp: true } : {}),
          ...(requestPreferredContact ? { preferredContact: requestPreferredContact } : {}),
        },
      });

      await saveCustomerDefaultAddress(customerId, req.body.shippingAddress);
    }

    const order = await prisma.order.create({
      // Pedido nasce PENDING e sem baixa de estoque. O estoque so muda no webhook PAID.
      data: {
        customerId,
        ...(checkoutAttemptId ? ({ checkoutAttemptId } as any) : {}),
        total: total.toFixed(2),
        status: 'PENDING',
        orderNotes: req.body.orderNotes || '',
        trackingToken: randomUUID(),
        shippingAddress: req.body.shippingAddress
          ? {
              ...req.body.shippingAddress,
              recipientDocument: requestCpf,
              shippingOption,
            }
          : null,
        melhorEnvioServiceId: shippingOption ? shippingOption.id : null,
        items: {
          create: orderItems.map((item) => ({
            productId: item.product.id,
            variantId: item.variant?.id || null,
            quantity: item.quantity,
            price: item.unitPrice.toFixed(2),
            ncm: item.product.ncm || null,
            cfop: resolveCfop(req.body.shippingAddress?.state),
            unit: item.product.unit || 'UN',
          })),
        },
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

    await createOrderEvent(order.id, 'ORDER_CREATED', 'Pedido criado.');
    await createOrderEvent(order.id, 'SHIPPING_SELECTED', 'Forma de entrega selecionada.', {
      serviceId: shippingOption?.id,
      price: shippingOption?.price,
      deadline: shippingOption?.deadline,
    });

    let payment;
    let responseOrder: any = order;

    try {
      const cardToken = String(req.body.cardToken || '').trim();
      const cardNetworkId = String(req.body.cardNetworkId || '').trim();

      payment = await paymentService.createTransaction({
        // A transacao do gateway e criada depois do pedido, porque o order.id interno
        // precisa ir em metadata para o webhook conseguir reconciliar o pagamento.
          orderId: order.id,
          total,
          paymentMethod,
          ...(paymentMethod === 'card' && cardToken ? { cardToken, cardNetworkId: cardNetworkId || undefined } : {}),
          customer: {
            name: customer.name,
            email: customer.email,
            cpf: requestCpf,
            phone: requestPhone || customer.phone,
          },
          items: orderItems.map((item) => ({
            productId: item.product.id,
            variantId: item.variant?.id || null,
            quantity: item.quantity,
            price: item.unitPrice,
            name: item.name,
          })),
        });

        const paymentOrder = await prisma.order.update({
          where: { id: order.id },
          data: {
            gatewayProvider: payment.provider,
            paymentMethod: payment.paymentMethod,
            gatewayOrderId: payment.gatewayOrderId,
            gatewayChargeId: payment.gatewayChargeId,
            paymentReference:
              payment.paymentMethod === 'card'
                ? payment.clientSecret || payment.paymentReference || payment.gatewayOrderId
                : payment.paymentReference ||
                  payment.pixCopyPaste ||
                  payment.clientSecret ||
                  payment.gatewayOrderId,
            paymentStatusDetail: payment.paymentStatusDetail || payment.status,
            paymentExpiresAt: payment.expiresAt ? new Date(payment.expiresAt) : null,
            paidAt: payment.paidAt ? new Date(payment.paidAt) : null,
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
        responseOrder = {
          ...order,
          ...paymentOrder,
        };
        await createOrderEvent(order.id, 'PAYMENT_PENDING', 'Pagamento iniciado.', {
          provider: payment.provider,
          method: payment.paymentMethod,
          expiresAt: payment.expiresAt,
          gatewayOrderId: payment.gatewayOrderId,
        });

        if (payment.status === 'paid') {
          const paidOrder = await markOrderPaid(order.id).catch(() => null);
          if (paidOrder) {
            emailService.sendOrderConfirmation(paidOrder);
            emailService.sendPaymentConfirmedToAdmin(paidOrder);
          }
        }
    } catch (paymentError) {
      // Se o gateway falhar depois de criar o pedido, cancelamos o pedido para
      // evitar um PENDING sem pagamento vinculado.
      const paymentErrorMessage =
        paymentError instanceof Error ? paymentError.message : 'Erro ao criar pagamento.';
      await prisma.order
        .update({
          where: { id: order.id },
          data: {
            status: 'CANCELED',
            paymentStatusDetail: paymentErrorMessage.slice(0, 255),
          },
        })
        .catch(() => undefined);
      await createOrderEvent(order.id, 'PAYMENT_FAILED', paymentErrorMessage, {
        provider: process.env.PAYMENT_PIX_PROVIDER || process.env.PAYMENT_PROVIDER,
        method: paymentMethod,
      }).catch(() => undefined);

      throw paymentError;
    }

    return res.status(201).json({
      order: responseOrder,
      payment,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';

    if (message.startsWith('Estoque insuficiente')) {
      return res.status(400).json({ error: message });
    }

    if (message.startsWith('Tamanho indisponivel')) {
      return res.status(400).json({ error: message });
    }

    if (message === 'Produto não encontrado no carrinho.') {
      return res
        .status(400)
        .json({ error: 'Um ou mais produtos do carrinho não foram encontrados.' });
    }

    if (
      message.includes('gateway') ||
      message.includes('Provedor de pagamento') ||
      message.includes('integrado') ||
      message.includes('Stripe') ||
      message.includes('STRIPE') ||
      message.includes('Mercado Pago') ||
      message.includes('MERCADO_PAGO') ||
      message.includes('invalid_email_for_sandbox') ||
      message.includes('cartao') ||
      message.includes('pagamento PIX')
    ) {
      return res.status(400).json({ error: message });
    }

    console.error(error);
    return res.status(500).json({ error: 'Não foi possível criar o pedido.' });
  }
};

export const getStoreOrderById = async (req: Request, res: Response) => {
  try {
    const customerId = getCustomerIdFromRequest(req);
    const orderId = Number(req.params.id);

    if (!customerId) {
      return res.status(401).json({ error: 'Entre para consultar o pedido.' });
    }

    if (Number.isNaN(orderId)) {
      return res.status(400).json({ error: 'ID do pedido inválido.' });
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        customerId,
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

    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }

    return res.status(200).json(order);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Não foi possível carregar o pedido.' });
  }
};

export const getStoreOrderPayment = async (req: Request, res: Response) => {
  try {
    const customerId = getCustomerIdFromRequest(req);
    const orderId = Number(req.params.id);

    if (!customerId) {
      return res.status(401).json({ error: 'Entre para consultar o pagamento.' });
    }

    if (Number.isNaN(orderId)) {
      return res.status(400).json({ error: 'ID do pedido inválido.' });
    }

    let order: any = await prisma.order.findFirst({
      where: {
        id: orderId,
        customerId,
      },
      include: {
        customer: true,
        events: {
          orderBy: { createdAt: 'asc' },
        } as any,
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
      } as any,
    });

    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }

    order = await syncPendingStripePayment(order);

    const paymentStatus = getPaymentStatus(order);

    if (paymentStatus === 'EXPIRED' && !order.expiredAt) {
      order = await prisma.order.update({
        where: { id: order.id },
        data: {
          expiredAt: order.paymentExpiresAt,
          paymentStatusDetail: 'expired',
        } as any,
        include: {
          customer: true,
          events: {
            orderBy: { createdAt: 'asc' },
          } as any,
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
        } as any,
      });
      await createOrderEvent(order.id, 'PAYMENT_EXPIRED', 'Pagamento expirado.');
      emailService.sendPaymentExpired(order);
    }

    return res.status(200).json(buildPaymentPayload(order));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Não foi possível carregar o pagamento.' });
  }
};

export const getStoreOrderByTrackingToken = async (req: Request, res: Response) => {
  try {
    const trackingToken = String(req.params.token || '').trim();

    if (!trackingToken) {
      return res.status(400).json({ error: 'Token de acompanhamento inválido.' });
    }

    const order = await prisma.order.findUnique({
      where: {
        trackingToken,
      },
      include: {
        customer: {
          select: {
            name: true,
            email: true,
          },
        },
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

    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }

    return res.status(200).json(order);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Não foi possível carregar o acompanhamento do pedido.' });
  }
};

export const completeTestStoreOrderPayment = async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Simulação de pagamento indisponível em produção.' });
    }

    const customerId = getCustomerIdFromRequest(req);
    const orderId = Number(req.params.id);

    if (!customerId) {
      return res.status(401).json({ error: 'Entre para concluir o pagamento.' });
    }

    if (Number.isNaN(orderId)) {
      return res.status(400).json({ error: 'ID do pedido inválido.' });
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        customerId,
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }

    if (order.status === OrderStatus.PAID) {
      const paidOrder = await prisma.order.findUnique({
        where: { id: orderId },
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

      return res.status(200).json(paidOrder);
    }

    const paidOrder = await markOrderPaid(orderId);
    if (paidOrder) {
      emailService.sendOrderConfirmation(paidOrder);
      emailService.sendPaymentConfirmedToAdmin(paidOrder);
    }
    return res.status(200).json(paidOrder);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';

    if (message.startsWith('Estoque insuficiente')) {
      return res.status(409).json({ error: message });
    }

    console.error(error);
    return res.status(500).json({ error: 'Não foi possível concluir o pagamento de teste.' });
  }
};
