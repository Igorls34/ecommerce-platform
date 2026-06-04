import { OrderStatus } from '@prisma/client';

import { prisma } from '../lib/prisma';

const PAID_STATUSES = new Set<string>([
  OrderStatus.PAID,
  'PREPARING',
  'PACKED',
  'LABEL_GENERATED',
  'POSTED',
  'SHIPPED',
  'DELIVERED',
  'PAID_STOCK_ISSUE',
]);

async function createOrderEvent(
  tx: any,
  orderId: number,
  type: string,
  message: string,
  metadata?: unknown,
) {
  if (!tx.orderEvent?.create) {
    return;
  }

  try {
    await tx.orderEvent.create({
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

export async function markOrderPaid(orderId: number) {
  return prisma.$transaction(async (tx) => {
    const currentOrder = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        customer: true,
      },
    });

    if (!currentOrder || PAID_STATUSES.has(String(currentOrder.status))) {
      return currentOrder;
    }

    for (const item of currentOrder.items) {
      const updateResult = item.variantId
        ? await (tx as any).productVariant.updateMany({
            where: {
              id: item.variantId,
              productId: item.productId,
              stock: {
                gte: item.quantity,
              },
              active: true,
            },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          })
        : await tx.product.updateMany({
            where: {
              id: item.productId,
              stock: {
                gte: item.quantity,
              },
            },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });

      if (updateResult.count !== 1) {
        const stockIssueOrder = await tx.order.update({
          where: { id: orderId },
          data: {
            status: 'PAID_STOCK_ISSUE' as OrderStatus,
            paidAt: new Date(),
            paymentStatusDetail: 'paid_stock_issue',
          },
          include: {
            customer: true,
            items: {
              include: {
                product: true,
                variant: true,
              },
            },
          },
        });

        await createOrderEvent(
          tx,
          orderId,
          'STOCK_ISSUE',
          'Pagamento confirmado, mas um item precisa de revisão de estoque.',
          { productId: item.productId, variantId: item.variantId, quantity: item.quantity },
        );

        return stockIssueOrder;
      }
    }

    const paidOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.PAID,
        paidAt: new Date(),
        paymentStatusDetail: 'paid',
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    await createOrderEvent(tx, orderId, 'PAYMENT_CONFIRMED', 'Pagamento confirmado.');
    await createOrderEvent(tx, orderId, 'STOCK_DECREASED', 'Estoque baixado apos pagamento.');

    return paidOrder;
  });
}
