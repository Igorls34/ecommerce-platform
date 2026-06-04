import { OrderStatus } from '@prisma/client';
import { Request, Response } from 'express';

import { prisma } from '../lib/prisma';

type NotificationSeverity = 'danger' | 'warning' | 'success' | 'info';

type AdminNotification = {
  id: string;
  type: string;
  severity: NotificationSeverity;
  title: string;
  message: string;
  actionLabel?: string;
  actionUrl?: string;
  createdAt: Date;
};

async function safeQuery<T>(query: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await query();
  } catch (error) {
    console.error('[admin-notifications] consulta ignorada:', error);
    return fallback;
  }
}

function toIsoNotification(notification: AdminNotification) {
  return {
    ...notification,
    createdAt: notification.createdAt.toISOString(),
  };
}

export const getAdminNotifications = async (_req: Request, res: Response) => {
  try {
    const [stockProducts, leads, customers, orders, melhorEnvioTokenEvents] = await Promise.all([
      safeQuery(
        () =>
          prisma.product.findMany({
            where: {
              stock: {
                lte: 3,
              },
            },
            select: {
              id: true,
              name: true,
              stock: true,
              updatedAt: true,
            },
            orderBy: [{ stock: 'asc' }, { updatedAt: 'desc' }],
            take: 12,
          }),
        [],
      ),
      safeQuery(
        () =>
          prisma.productAvailabilityLead.findMany({
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  stock: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 8,
          }),
        [],
      ),
      safeQuery(
        () =>
          prisma.customer.findMany({
            select: {
              id: true,
              name: true,
              email: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 6,
          }),
        [],
      ),
      safeQuery(
        () =>
          prisma.order.findMany({
            select: {
              id: true,
              total: true,
              status: true,
              createdAt: true,
              customer: {
                select: {
                  name: true,
                },
              },
              items: {
                select: {
                  quantity: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 6,
          }),
        [],
      ),
      safeQuery(
        () =>
          prisma.melhorEnvioTokenEvent.findMany({
            orderBy: {
              createdAt: 'desc',
            },
            take: 8,
          }),
        [],
      ),
    ]);

    const notifications: AdminNotification[] = [
      ...stockProducts.map((product) => {
        const isOutOfStock = Number(product.stock) <= 0;

        return {
          id: `${isOutOfStock ? 'stock-out' : 'stock-low'}-${product.id}`,
          type: isOutOfStock ? 'stock_out' : 'stock_low',
          severity: isOutOfStock ? 'danger' : 'warning',
          title: isOutOfStock ? 'Produto esgotado' : 'Produto acabando',
          message: isOutOfStock
            ? `${product.name} está sem estoque.`
            : `${product.name} tem apenas ${product.stock} unidade(s).`,
          actionLabel: 'Editar',
          actionUrl: `/produtos/${product.id}/editar`,
          createdAt: product.updatedAt,
        } satisfies AdminNotification;
      }),
      ...leads.map(
        (lead) =>
          ({
            id: `lead-${lead.id}`,
            type: 'availability_lead',
            severity: Number(lead.product?.stock || 0) <= 0 ? 'warning' : 'info',
            title: 'Cliente pediu aviso',
            message: `${lead.name} quer ser avisado sobre ${lead.product?.name || 'um produto removido'}.`,
            actionLabel: 'Ver avisos',
            actionUrl: '/avisos',
            createdAt: lead.createdAt,
          }) satisfies AdminNotification,
      ),
      ...customers.map(
        (customer) =>
          ({
            id: `customer-${customer.id}`,
            type: 'customer_created',
            severity: 'info',
            title: 'Cliente captado',
            message: `${customer.name} entrou na base pelo e-mail ${customer.email}.`,
            actionLabel: 'Ver clientes',
            actionUrl: '/clientes',
            createdAt: customer.createdAt,
          }) satisfies AdminNotification,
      ),
      ...orders.map((order) => {
        const itemCount = order.items.reduce(
          (total, item) => total + Number(item.quantity || 0),
          0,
        );
        const isPaid = order.status === OrderStatus.PAID;

        return {
          id: `order-${order.id}`,
          type: isPaid ? 'sale_paid' : 'order_created',
          severity: isPaid ? 'success' : 'info',
          title: isPaid ? 'Venda confirmada' : 'Pedido recebido',
          message: `#${order.id} de ${order.customer?.name || 'cliente'} com ${itemCount} item(ns), total R$ ${Number(order.total).toFixed(2)}.`,
          createdAt: order.createdAt,
        } satisfies AdminNotification;
      }),
      ...melhorEnvioTokenEvents.map(
        (event) =>
          ({
            id: `melhor-envio-token-${event.id}`,
            type: 'melhor_envio_token',
            severity:
              event.status === 'success'
                ? 'success'
                : event.status === 'warning'
                  ? 'warning'
                  : 'danger',
            title: event.title,
            message: event.message,
            createdAt: event.createdAt,
          }) satisfies AdminNotification,
      ),
    ];

    const sortedNotifications = notifications
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 30);

    return res.status(200).json({
      generatedAt: new Date().toISOString(),
      counts: {
        total: sortedNotifications.length,
        danger: sortedNotifications.filter((notification) => notification.severity === 'danger')
          .length,
        warning: sortedNotifications.filter((notification) => notification.severity === 'warning')
          .length,
      },
      notifications: sortedNotifications.map(toIsoNotification),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao listar alertas do admin.' });
  }
};
