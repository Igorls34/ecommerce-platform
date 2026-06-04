import { OrderStatus } from '@prisma/client';
import { Request, Response } from 'express';

import { prisma } from '../lib/prisma';

const PAID_ORDER_STATUSES = [
  OrderStatus.PAID,
  OrderStatus.PREPARING,
  OrderStatus.PACKED,
  OrderStatus.LABEL_GENERATED,
  OrderStatus.POSTED,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
  'PAID_STOCK_ISSUE' as OrderStatus,
];
const PENDING_ORDER_STATUSES: OrderStatus[] = [OrderStatus.PENDING];
const CANCELED_ORDER_STATUSES: OrderStatus[] = [OrderStatus.CANCELED];
const SHIPPING_PENDING_STATUSES = [
  OrderStatus.PAID,
  'PAID_STOCK_ISSUE' as OrderStatus,
  OrderStatus.PREPARING,
  OrderStatus.PACKED,
];
const LABEL_GENERATED_STATUSES = [OrderStatus.LABEL_GENERATED];
const SHIPPED_ORDER_STATUSES = [OrderStatus.POSTED, OrderStatus.SHIPPED];

function startOfDay(date: Date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

function formatWeekdayLabel(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
  })
    .format(date)
    .replace('.', '');
}

function normalizeCustomerSource(value: string | null) {
  const source = String(value || '')
    .trim()
    .toLowerCase();

  if (source === 'google') {
    return 'Google';
  }

  if (source === 'store_register') {
    return 'Cadastro';
  }

  if (source === 'store_form') {
    return 'Formulario';
  }

  return source ? source : 'Loja';
}

function safePercent(value: number, total: number) {
  return total ? (value / total) * 100 : 0;
}

function buildEmptyTimeline() {
  const today = startOfDay(new Date());

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));

    return {
      date,
      label: formatDayLabel(date),
      weekday: formatWeekdayLabel(date),
      orders: 0,
      paidOrders: 0,
      pendingOrders: 0,
      canceledOrders: 0,
      paidRevenue: 0,
      customers: 0,
    };
  });
}

function buildTimelineInsights(timeline: Array<{
  label: string;
  orders: number;
  paidOrders: number;
  canceledOrders: number;
}>) {
  const insights: string[] = [];
  const totalOrders = timeline.reduce((sum, day) => sum + day.orders, 0);
  const busiestDay = timeline.reduce(
    (highest, day) => (day.orders > (highest?.orders || 0) ? day : highest),
    null as null | { label: string; orders: number },
  );

  timeline.forEach((day) => {
    if (day.orders >= 3 && day.paidOrders === 0) {
      insights.push(
        `No dia ${day.label} houve volume de pedidos sem pagamento confirmado. Verifique pendências, cancelamentos ou pedidos de teste.`,
      );
    }

    if (day.orders >= 3 && safePercent(day.canceledOrders, day.orders) >= 30) {
      insights.push(
        `No dia ${day.label} houve concentração de cancelamentos. Revise o fluxo de pagamento e frete desse período.`,
      );
    }
  });

  if (busiestDay && totalOrders > 0 && safePercent(busiestDay.orders, totalOrders) >= 50) {
    insights.push(
      `A maior parte dos pedidos dos últimos 7 dias se concentrou em ${busiestDay.label}. Confira se foi campanha, operação real ou teste interno.`,
    );
  }

  return insights.slice(0, 3);
}

function buildAutomaticInsights(metrics: {
  cancellationRate: number;
  pendingOrders: number;
  paidOrders: number;
  totalOrders: number;
  pendingRevenue: number;
  paidRevenue: number;
  lowStockCount: number;
  totalProducts: number;
  totalCustomers: number;
  customersWithPaidOrders: number;
  categoryDistribution: Array<{ label: string; value: number }>;
  mostFrequentCustomerOrders: number;
}) {
  const insights: Array<{ tone: string; title: string; message: string }> = [];

  if (metrics.cancellationRate >= 30) {
    insights.push({
      tone: 'danger',
      title: 'Cancelamentos altos',
      message:
        'A taxa de cancelamento está alta. Recomenda-se investigar checkout, pagamento, frete ou pedidos de teste.',
    });
  }

  if (metrics.pendingOrders > metrics.paidOrders && metrics.totalOrders > 0) {
    insights.push({
      tone: 'warning',
      title: 'Muitos pedidos pendentes',
      message:
        'Existem mais pedidos pendentes do que pagos. Vale priorizar follow-up ou verificar se o pagamento está sendo concluído corretamente.',
    });
  }

  if (metrics.pendingRevenue > metrics.paidRevenue && metrics.pendingRevenue > 0) {
    insights.push({
      tone: 'warning',
      title: 'Receita em aberto relevante',
      message:
        'Há um valor relevante em aberto. Verifique pedidos pendentes que ainda podem ser recuperados.',
    });
  }

  if (metrics.lowStockCount > 0) {
    insights.push({
      tone: 'warning',
      title: 'Estoque em alerta',
      message:
        'Existem produtos com estoque em alerta. Avalie reposição para evitar venda indisponível.',
    });
  }

  if (
    metrics.categoryDistribution[0] &&
    safePercent(metrics.categoryDistribution[0].value, metrics.totalProducts) >= 80
  ) {
    insights.push({
      tone: 'neutral',
      title: 'Catálogo concentrado',
      message:
        'O catálogo está concentrado em poucas categorias. Pode valer revisar a distribuição dos produtos.',
    });
  }

  if (metrics.customersWithPaidOrders <= 1 && metrics.totalCustomers > 0) {
    insights.push({
      tone: 'neutral',
      title: 'Base de compradores pequena',
      message:
        'A base de compradores ainda está pequena. O dashboard pode estar refletindo ambiente de teste ou fase inicial de operação.',
    });
  }

  if (metrics.mostFrequentCustomerOrders >= 3) {
    insights.push({
      tone: 'warning',
      title: 'Pedidos concentrados em um cliente',
      message:
        'Há concentração de pedidos em um único cliente. Verifique se são pedidos reais ou testes internos.',
    });
  }

  if (!insights.length) {
    insights.push({
      tone: 'success',
      title: 'Operação sem alerta crítico',
      message:
        'Não foram encontrados alertas gerenciais relevantes com os dados atuais. Continue acompanhando pagamentos, estoque e envio.',
    });
  }

  return insights;
}

export const getAdminDashboard = async (_req: Request, res: Response) => {
  try {
    const today = startOfDay(new Date());
    const timelineStart = new Date(today);
    timelineStart.setDate(today.getDate() - 6);

    const [
      totalProducts,
      totalCategories,
      activeCategoryCount,
      totalCustomers,
      totalOrders,
      lowStockCount,
      stockAggregate,
      inventoryProducts,
      paidOrders,
      pendingOrders,
      canceledOrders,
      awaitingShippingOrders,
      labelGeneratedOrders,
      shippedOrders,
      deliveredOrders,
      paidRevenueAggregate,
      pendingRevenueAggregate,
      canceledRevenueAggregate,
      highestOrder,
      categoryDistributionRows,
      topCategoriesRows,
      customerSourceRows,
      recentOrders,
      recentProducts,
      ordersInTimeline,
      customersInTimeline,
      weekdayOrders,
      customersWithOrdersRows,
      customersWithPaidOrdersRows,
      orderCustomerRows,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.category.count(),
      prisma.category.count({ where: { products: { some: {} } } }),
      prisma.customer.count(),
      prisma.order.count(),
      prisma.product.count({ where: { stock: { lte: 3 } } }),
      prisma.product.aggregate({ _sum: { stock: true } }),
      prisma.product.findMany({
        select: { price: true, stock: true },
      }),
      prisma.order.count({ where: { status: { in: PAID_ORDER_STATUSES } } }),
      prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      prisma.order.count({ where: { status: OrderStatus.CANCELED } }),
      prisma.order.count({ where: { status: { in: SHIPPING_PENDING_STATUSES } } }),
      prisma.order.count({ where: { status: { in: LABEL_GENERATED_STATUSES } } }),
      prisma.order.count({ where: { status: { in: SHIPPED_ORDER_STATUSES } } }),
      prisma.order.count({ where: { status: OrderStatus.DELIVERED } }),
      prisma.order.aggregate({
        where: { status: { in: PAID_ORDER_STATUSES } },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: { status: OrderStatus.PENDING },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: { status: OrderStatus.CANCELED },
        _sum: { total: true },
      }),
      prisma.order.findFirst({
        orderBy: { total: 'desc' },
        select: {
          total: true,
          customer: { select: { name: true } },
        },
      }),
      prisma.category.findMany({
        select: {
          name: true,
          _count: { select: { products: true } },
        },
        orderBy: {
          products: {
            _count: 'desc',
          },
        },
        take: 5,
      }),
      prisma.category.findMany({
        select: {
          name: true,
          products: {
            select: { stock: true },
          },
          _count: { select: { products: true } },
        },
        take: 20,
      }),
      prisma.customer.groupBy({
        by: ['leadSource'],
        _count: { _all: true },
        orderBy: { _count: { leadSource: 'desc' } },
        take: 5,
      }),
      prisma.order.findMany({
        include: {
          customer: { select: { id: true, name: true, email: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.product.findMany({
        include: {
          category: true,
        },
        orderBy: { id: 'desc' },
        take: 5,
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: timelineStart } },
        select: { createdAt: true, total: true, status: true },
      }),
      prisma.customer.findMany({
        where: { createdAt: { gte: timelineStart } },
        select: { createdAt: true },
      }),
      prisma.order.findMany({
        select: { createdAt: true },
      }),
      prisma.order.groupBy({
        by: ['customerId'],
      }),
      prisma.order.groupBy({
        by: ['customerId'],
        where: { status: { in: PAID_ORDER_STATUSES } },
      }),
      prisma.order.groupBy({
        by: ['customerId'],
        _count: { _all: true },
      }),
    ]);

    const paidRevenue = Number(paidRevenueAggregate._sum.total || 0);
    const pendingRevenue = Number(pendingRevenueAggregate._sum.total || 0);
    const canceledRevenue = Number(canceledRevenueAggregate._sum.total || 0);
    const potentialRevenue = paidRevenue + pendingRevenue + canceledRevenue;
    const inventoryValue = inventoryProducts.reduce(
      (sum, product) => sum + Number(product.price || 0) * Number(product.stock || 0),
      0,
    );

    const timeline = buildEmptyTimeline();
    ordersInTimeline.forEach((order) => {
      const orderDate = startOfDay(order.createdAt).getTime();
      const day = timeline.find((item) => item.date.getTime() === orderDate);

      if (!day) {
        return;
      }

      day.orders += 1;
      if (PAID_ORDER_STATUSES.includes(order.status)) {
        day.paidOrders += 1;
        day.paidRevenue += Number(order.total || 0);
      }
      if (PENDING_ORDER_STATUSES.includes(order.status)) {
        day.pendingOrders += 1;
      }
      if (CANCELED_ORDER_STATUSES.includes(order.status)) {
        day.canceledOrders += 1;
      }
    });
    customersInTimeline.forEach((customer) => {
      const customerDate = startOfDay(customer.createdAt).getTime();
      const day = timeline.find((item) => item.date.getTime() === customerDate);

      if (day) {
        day.customers += 1;
      }
    });

    const weekdayOrderHeatmap = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(
      (label, weekdayIndex) => ({
        label,
        value: weekdayOrders.filter((order) => order.createdAt.getDay() === weekdayIndex).length,
      }),
    );

    const topCategoriesByStock = topCategoriesRows
      .map((category) => ({
        label: category.name,
        stock: category.products.reduce((sum, product) => sum + Number(product.stock || 0), 0),
        products: category._count.products,
      }))
      .sort((left, right) => right.stock - left.stock)
      .slice(0, 5);

    const customersWithOrders = customersWithOrdersRows.length;
    const customersWithPaidOrders = customersWithPaidOrdersRows.length;
    const categoryDistribution = categoryDistributionRows.map((category) => ({
      label: category.name,
      value: category._count.products,
    }));
    const categoriesWithProducts = activeCategoryCount;
    const emptyCategories = Math.max(0, totalCategories - categoriesWithProducts);
    const categoryWithMostProducts = categoryDistribution[0] || null;
    const categoryWithMostStock = topCategoriesByStock[0] || null;
    const cancellationRate = safePercent(canceledOrders, totalOrders);
    const pendingRate = safePercent(pendingOrders, totalOrders);
    const paymentConfirmationRate = safePercent(paidOrders, totalOrders);
    const customerPurchaseRate = safePercent(customersWithOrders, totalCustomers);
    const confirmedRevenueShare = safePercent(paidRevenue, potentialRevenue);
    const canceledRevenueShare = safePercent(canceledRevenue, potentialRevenue);
    const mostFrequentCustomerOrders = Math.max(
      ...orderCustomerRows.map((row) => Number(row._count?._all || 0)),
      0,
    );
    const last7DaysTimeline = timeline.map(({ date: _date, ...item }) => item);

    return res.status(200).json({
      summary: {
        totalProducts,
        totalCategories,
        categoriesWithProducts,
        emptyCategories,
        totalCustomers,
        customersWithOrders,
        customersWithPaidOrders,
        totalOrders,
        totalStock: Number(stockAggregate._sum.stock || 0),
        lowStockCount,
        inventoryValue,
        paidOrders,
        pendingOrders,
        canceledOrders,
        awaitingActionOrders: pendingOrders + awaitingShippingOrders,
        awaitingShippingOrders,
        labelGeneratedOrders,
        shippedOrders,
        deliveredOrders,
        paidRevenue,
        pendingRevenue,
        canceledRevenue,
        potentialRevenue,
        averageTicket: paidOrders ? paidRevenue / paidOrders : 0,
        highestOrderValue: Number(highestOrder?.total || 0),
        highestOrderCustomer: highestOrder?.customer?.name || null,
        paymentConversionRate: paymentConfirmationRate,
        paymentConfirmationRate,
        cancellationRate,
        pendingRate,
        customerPurchaseRate,
        confirmedRevenueShare,
        canceledRevenueShare,
        categoryDistribution,
        stockByBand: [
          {
            label: 'Sem estoque',
            value: inventoryProducts.filter((product) => Number(product.stock || 0) <= 0).length,
            tone: 'danger',
          },
          {
            label: 'Crítico',
            value: inventoryProducts.filter(
              (product) => Number(product.stock || 0) > 0 && Number(product.stock || 0) <= 3,
            ).length,
            tone: 'danger',
          },
          {
            label: 'Atenção',
            value: inventoryProducts.filter(
              (product) => Number(product.stock || 0) > 3 && Number(product.stock || 0) <= 10,
            ).length,
            tone: 'warning',
          },
          {
            label: 'Saudável',
            value: inventoryProducts.filter((product) => Number(product.stock || 0) > 10).length,
            tone: 'success',
          },
        ],
        orderStatusDistribution: [
          { label: 'Pagos', value: paidOrders, tone: 'success' },
          { label: 'Pendentes', value: pendingOrders, tone: 'warning' },
          { label: 'Cancelados', value: canceledOrders, tone: 'danger' },
        ],
        customerSourceDistribution: customerSourceRows.map((row) => ({
          label: normalizeCustomerSource(row.leadSource),
          value: row._count._all,
        })),
        revenueByStatus: [
          { label: 'Receita confirmada', value: paidRevenue, tone: 'success' },
          { label: 'Receita em aberto', value: pendingRevenue, tone: 'warning' },
          { label: 'Perda por cancelamento', value: canceledRevenue, tone: 'danger' },
        ],
        topInventoryProducts: [],
        topCategoriesByStock,
        categoryWithMostProducts,
        categoryWithMostStock,
        last7DaysTimeline,
        timelineInsights: buildTimelineInsights(last7DaysTimeline),
        weekdayOrderHeatmap,
        conversionStages: [
          { label: 'Clientes cadastrados', value: totalCustomers, baseValue: totalCustomers, previousValue: totalCustomers, tone: 'neutral' },
          { label: 'Clientes compradores', value: customersWithOrders, baseValue: totalCustomers, previousValue: totalCustomers, tone: 'warning' },
          { label: 'Pedidos criados', value: totalOrders, baseValue: totalCustomers, previousValue: customersWithOrders, tone: 'accent' },
          { label: 'Pedidos pagos', value: paidOrders, baseValue: totalCustomers, previousValue: totalOrders, tone: 'success' },
          { label: 'Aguardando envio', value: awaitingShippingOrders, baseValue: totalCustomers, previousValue: paidOrders, tone: 'warning' },
          { label: 'Pedidos enviados', value: shippedOrders, baseValue: totalCustomers, previousValue: awaitingShippingOrders || paidOrders, tone: 'accent' },
          { label: 'Pedidos entregues', value: deliveredOrders, baseValue: totalCustomers, previousValue: shippedOrders, tone: 'success' },
        ],
        automaticInsights: buildAutomaticInsights({
          cancellationRate,
          pendingOrders,
          paidOrders,
          totalOrders,
          pendingRevenue,
          paidRevenue,
          lowStockCount,
          totalProducts,
          totalCustomers,
          customersWithPaidOrders,
          categoryDistribution,
          mostFrequentCustomerOrders,
        }),
      },
      recentOrders,
      recentProducts,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao carregar dashboard.' });
  }
};
