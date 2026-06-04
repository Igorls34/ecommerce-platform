function normalizeCollection(input) {
  return Array.isArray(input) ? input : [];
}

function normalizeCategoryLabel(value) {
  return String(value || '').trim() || 'Sem categoria';
}

function normalizeStatus(status) {
  return String(status || '').trim().toUpperCase();
}

function normalizeCustomerSource(value) {
  const source = String(value || '').trim().toLowerCase();

  if (source === 'google') {
    return 'Google';
  }

  if (source === 'store_register') {
    return 'Cadastro';
  }

  if (source === 'store_form') {
    return 'Formulário';
  }

  return source || 'Loja';
}

function buildCategoryLookup(products, categories) {
  const categoryLookup = new Map();

  normalizeCollection(categories).forEach((category) => {
    categoryLookup.set(Number(category.id), category.name || `Categoria ${category.id}`);
  });

  normalizeCollection(products).forEach((product) => {
    if (product?.category?.name) {
      categoryLookup.set(Number(product.categoryId || product.category?.id), product.category.name);
    }
  });

  return categoryLookup;
}

function startOfDay(date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function formatDayLabel(date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

function formatWeekdayLabel(date) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
  })
    .format(date)
    .replace('.', '');
}

function formatCurrencyBRL(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatPercentBR(value) {
  return `${Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

const PAID_ORDER_STATUSES = new Set([
  'PAID',
  'PAID_STOCK_ISSUE',
  'PREPARING',
  'PACKED',
  'LABEL_GENERATED',
  'POSTED',
  'SHIPPED',
  'DELIVERED',
]);
const CANCELED_ORDER_STATUSES = new Set(['CANCELED', 'CANCELLED']);
const PENDING_ORDER_STATUSES = new Set(['PENDING']);
const SHIPPING_PENDING_STATUSES = new Set(['PAID', 'PAID_STOCK_ISSUE', 'PREPARING', 'PACKED']);
const LABEL_GENERATED_STATUSES = new Set(['LABEL_GENERATED', 'LABEL_GEN', 'WAITING_LABEL']);
const SHIPPED_ORDER_STATUSES = new Set(['POSTED', 'SHIPPED', 'IN_TRANSIT']);
const DELIVERED_ORDER_STATUSES = new Set(['DELIVERED']);
const FAILED_ORDER_STATUSES = new Set(['PAYMENT_FAILED']);
const KNOWN_ORDER_STATUSES = new Set([
  ...PAID_ORDER_STATUSES,
  ...CANCELED_ORDER_STATUSES,
  ...PENDING_ORDER_STATUSES,
  ...LABEL_GENERATED_STATUSES,
  ...SHIPPED_ORDER_STATUSES,
  ...DELIVERED_ORDER_STATUSES,
  ...FAILED_ORDER_STATUSES,
  'READY_TO_SHIP',
]);

export function safePercent(value, total) {
  const normalizedTotal = Number(total || 0);

  if (!normalizedTotal) {
    return 0;
  }

  return (Number(value || 0) / normalizedTotal) * 100;
}

export function getFriendlyOrderStatus(status) {
  const labels = {
    PENDING: 'Pendente',
    PAID: 'Pago',
    PAID_STOCK_ISSUE: 'Pago com ajuste de estoque',
    PAYMENT_FAILED: 'Pagamento falhou',
    PREPARING: 'Em preparação',
    PACKED: 'Embalado',
    WAITING_LABEL: 'Aguardando etiqueta',
    LABEL_GEN: 'Etiqueta gerada',
    LABEL_GENERATED: 'Etiqueta gerada',
    READY_TO_SHIP: 'Pronto para envio',
    POSTED: 'Postado',
    SHIPPED: 'Enviado',
    IN_TRANSIT: 'Em transporte',
    DELIVERED: 'Entregue',
    CANCELED: 'Cancelado',
    CANCELLED: 'Cancelado',
  };

  return labels[normalizeStatus(status)] || 'Status desconhecido';
}

export function getOrderActionLabel(order = {}) {
  const status = normalizeStatus(order.status);

  if (PENDING_ORDER_STATUSES.has(status)) {
    return 'Aguardando pagamento';
  }

  if (FAILED_ORDER_STATUSES.has(status)) {
    return 'Verificar pagamento';
  }

  if (SHIPPING_PENDING_STATUSES.has(status)) {
    return 'Gerar etiqueta ou preparar envio';
  }

  if (LABEL_GENERATED_STATUSES.has(status) || status === 'READY_TO_SHIP' || order.melhorEnvioLabelUrl) {
    return 'Pronto para envio';
  }

  if (SHIPPED_ORDER_STATUSES.has(status)) {
    return 'Acompanhar entrega';
  }

  if (DELIVERED_ORDER_STATUSES.has(status)) {
    return 'Pedido concluído';
  }

  if (CANCELED_ORDER_STATUSES.has(status)) {
    return 'Sem ação';
  }

  return 'Revisar';
}

export function classifyDashboardStock(quantity) {
  const stock = Number(quantity || 0);

  if (stock <= 0) {
    return 'Sem estoque';
  }

  if (stock <= 3) {
    return 'Crítico';
  }

  if (stock <= 10) {
    return 'Atenção';
  }

  return 'Saudável';
}

function buildAutomaticInsights(metrics) {
  if (metrics.totalOrders === 0) {
    return [
      {
        tone: 'neutral',
        title: 'Sem pedidos no período',
        message: 'Ainda não há pedidos registrados no período.',
      },
    ];
  }

  const insights = [];

  if (metrics.paidOrders > 0) {
    insights.push({
      tone: 'success',
      title: 'Receita confirmada',
      message: `A loja já possui pedidos pagos no período, com receita confirmada de ${metrics.formattedPaidRevenue}.`,
    });
  }

  if (metrics.cancellationRate >= 30) {
    insights.push({
      tone: 'danger',
      title: 'Cancelamentos altos',
      message:
        'A taxa de cancelamento está alta. Recomenda-se investigar checkout, pagamento, frete ou pedidos de teste.',
    });
  }

  if (metrics.pendingOrders > 0) {
    insights.push({
      tone: 'warning',
      title: 'Pedidos pendentes',
      message: 'Existem pedidos pendentes que podem representar receita recuperável.',
    });
  }

  if (metrics.pendingOrders > metrics.paidOrders) {
    insights.push({
      tone: 'warning',
      title: 'Muitos pedidos pendentes',
      message:
        'Há mais pedidos pendentes do que pagos. Verifique se o fluxo de pagamento está claro e funcionando corretamente.',
    });
  }

  if (metrics.pendingRevenue > 0) {
    insights.push({
      tone: 'warning',
      title: 'Receita em aberto',
      message: 'Existe valor em aberto que pode ser acompanhado.',
    });
  }

  if (metrics.lowStockCount > 0) {
    insights.push({
      tone: 'warning',
      title: 'Estoque em atenção',
      message: 'Existem produtos com estoque em atenção. Avalie reposição.',
    });
  }

  if (metrics.emptyCategories > 0) {
    insights.push({
      tone: 'warning',
      title: 'Categorias vazias',
      message: 'Existem categorias vazias. Avalie cadastrar produtos ou ocultar essas categorias da loja.',
    });
  }

  if (metrics.categoryDistribution[0] && safePercent(metrics.categoryDistribution[0].value, metrics.totalProducts) >= 70) {
    insights.push({
      tone: 'neutral',
      title: 'Catálogo concentrado',
      message: 'O catálogo está concentrado em uma categoria. Pode ser interessante diversificar os produtos.',
    });
  }

  if (metrics.mostFrequentCustomerOrders >= 3) {
    insights.push({
      tone: 'warning',
      title: 'Pedidos concentrados em um cliente',
      message:
        'Há concentração de pedidos em um único cliente. Verifique se os dados representam vendas reais ou ambiente de teste.',
    });
  }

  if (!insights.length) {
    insights.push({
      tone: 'success',
      title: 'Operação sem alerta crítico',
      message: 'Nenhum alerta crítico encontrado no momento.',
    });
  }

  return insights;
}

function buildOperationalAlerts(metrics) {
  const alerts = [];

  if (metrics.cancellationRate >= 30) {
    alerts.push({
      tone: 'danger',
      title: 'Cancelamento alto',
      message: 'Taxa de cancelamento alta. Verifique checkout, pagamento, frete ou pedidos de teste.',
    });
  }

  if (metrics.pendingOrders > 0) {
    alerts.push({
      tone: 'warning',
      title: 'Pedidos pendentes',
      message: 'Existem pedidos aguardando pagamento.',
    });
  }

  if (metrics.pendingOrders > metrics.paidOrders && metrics.totalOrders > 0) {
    alerts.push({
      tone: 'warning',
      title: 'Pagamento em atenção',
      message: 'Há mais pedidos pendentes do que pagos. Verifique possíveis gargalos no pagamento.',
    });
  }

  if (metrics.lowStockCount > 0) {
    alerts.push({
      tone: 'warning',
      title: 'Estoque em atenção',
      message: 'Existem produtos com estoque baixo ou em atenção.',
    });
  }

  if (metrics.emptyCategories > 0) {
    alerts.push({
      tone: 'warning',
      title: 'Categorias vazias',
      message: 'Existem categorias cadastradas sem produtos.',
    });
  }

  if (metrics.awaitingShippingOrders > 0) {
    alerts.push({
      tone: 'warning',
      title: 'Ação logística',
      message: 'Existem pedidos pagos que ainda precisam de ação logística.',
    });
  }

  if (metrics.unknownStatusCount > 0) {
    alerts.push({
      tone: 'neutral',
      title: 'Status não mapeado',
      message: 'Existem pedidos com status não mapeado.',
    });
  }

  if (!alerts.length) {
    alerts.push({
      tone: 'success',
      title: 'Operação sem alerta crítico',
      message: 'Nenhum alerta crítico encontrado no momento.',
    });
  }

  return alerts;
}

function buildTimelineInsights(timeline) {
  const insights = [];
  const totalOrders = timeline.reduce((sum, day) => sum + Number(day.orders || 0), 0);
  const busiestDay = timeline.reduce(
    (highest, day) => (Number(day.orders || 0) > Number(highest?.orders || 0) ? day : highest),
    null,
  );

  timeline.forEach((day) => {
    if (day.orders >= 3 && day.paidOrders === 0) {
      insights.push(
        `No dia ${day.label} houve alto volume de pedidos, mas baixa receita confirmada. Verifique pendências, cancelamentos ou testes.`,
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

function buildAutomaticAnalysisText(summary) {
  if (summary.totalOrders === 0) {
    return 'Ainda não há pedidos registrados no período.';
  }

  const parts = [
    `Foram registrados ${summary.totalOrders} pedidos no período, com ${summary.paidOrders} pagamentos confirmados e ${summary.canceledOrders} cancelamentos.`,
  ];

  if (summary.paidOrders > 0) {
    parts.push(`A receita confirmada é de ${summary.formattedPaidRevenue}.`);
  }

  if (summary.cancellationRate >= 30) {
    parts.push(
      `A taxa de cancelamento está alta, representando ${summary.formattedCancellationRate} dos pedidos. Recomenda-se investigar se os cancelamentos estão relacionados ao checkout, pagamento, frete ou pedidos de teste.`,
    );
  }

  if (summary.pendingOrders > 0) {
    parts.push(
      `Também existem ${summary.pendingOrders} pedidos pendentes que podem representar receita recuperável.`,
    );
  }

  if (summary.pendingOrders > summary.paidOrders) {
    parts.push('Há mais pedidos pendentes do que pagos. Verifique se o fluxo de pagamento está claro e funcionando corretamente.');
  }

  if (summary.pendingRevenue > 0) {
    parts.push(`Existe ${summary.formattedPendingRevenue} em aberto para acompanhamento.`);
  }

  if (summary.lowStockCount > 0) {
    parts.push('Existem produtos com estoque em atenção. Avalie reposição.');
  }

  if (summary.emptyCategories > 0) {
    parts.push('Existem categorias vazias. Avalie cadastrar produtos ou ocultar essas categorias da loja.');
  }

  return parts.join(' ');
}

export function buildDashboardSummary(input) {
  const isLegacyProductsArray = Array.isArray(input);
  const products = normalizeCollection(isLegacyProductsArray ? input : input?.products);
  const orders = normalizeCollection(isLegacyProductsArray ? [] : input?.orders);
  const customers = normalizeCollection(isLegacyProductsArray ? [] : input?.customers);
  const categories = normalizeCollection(isLegacyProductsArray ? [] : input?.categories);
  const categoryLookup = buildCategoryLookup(products, categories);

  const totalStock = products.reduce((sum, product) => sum + Number(product.stock || 0), 0);
  const lowStockCount = products.filter((product) => Number(product.stock || 0) <= 3).length;
  const inventoryValue = products.reduce((sum, product) => {
    return sum + Number(product.price || 0) * Number(product.stock || 0);
  }, 0);

  const paidOrders = orders.filter((order) => PAID_ORDER_STATUSES.has(normalizeStatus(order.status)));
  const pendingOrders = orders.filter((order) => PENDING_ORDER_STATUSES.has(normalizeStatus(order.status)));
  const canceledOrders = orders.filter((order) => CANCELED_ORDER_STATUSES.has(normalizeStatus(order.status)));
  const awaitingShippingOrders = orders.filter((order) =>
    SHIPPING_PENDING_STATUSES.has(normalizeStatus(order.status)),
  );
  const labelGeneratedOrders = orders.filter((order) =>
    LABEL_GENERATED_STATUSES.has(normalizeStatus(order.status)),
  );
  const shippedOrders = orders.filter((order) => SHIPPED_ORDER_STATUSES.has(normalizeStatus(order.status)));
  const deliveredOrders = orders.filter((order) => DELIVERED_ORDER_STATUSES.has(normalizeStatus(order.status)));
  const failedOrders = orders.filter((order) => FAILED_ORDER_STATUSES.has(normalizeStatus(order.status)));
  const unknownStatusOrders = orders.filter((order) => !KNOWN_ORDER_STATUSES.has(normalizeStatus(order.status)));
  const paidRevenue = paidOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const pendingRevenue = pendingOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const canceledRevenue = canceledOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const potentialRevenue = paidRevenue + pendingRevenue + canceledRevenue;
  const averageTicket = paidOrders.length ? paidRevenue / paidOrders.length : 0;
  const customersWithOrders = new Set(
    orders.map((order) => Number(order.customerId || order.customer?.id || 0)).filter(Boolean),
  ).size;
  const customersWithPaidOrders = new Set(
    paidOrders.map((order) => Number(order.customerId || order.customer?.id || 0)).filter(Boolean),
  ).size;
  const orderCountByCustomer = orders.reduce((map, order) => {
    const customerId = Number(order.customerId || order.customer?.id || 0);
    if (customerId) {
      map.set(customerId, (map.get(customerId) || 0) + 1);
    }
    return map;
  }, new Map());
  const mostFrequentCustomerOrders = Math.max(...orderCountByCustomer.values(), 0);

  const categoryMap = products.reduce((map, product) => {
    const categoryId = Number(product.categoryId || product.category?.id || 0);
    const categoryName = normalizeCategoryLabel(
      categoryLookup.get(categoryId) ||
        product.category?.name ||
        (categoryId ? `Categoria ${categoryId}` : 'Sem categoria'),
    );

    map.set(categoryName, (map.get(categoryName) || 0) + 1);
    return map;
  }, new Map());

  const categoryDistribution = [...categoryMap.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 5);

  const stockByBand = [
    {
      label: 'Sem estoque',
      value: products.filter((product) => Number(product.stock || 0) <= 0).length,
      tone: 'danger',
    },
    {
      label: 'Crítico',
      value: products.filter((product) => Number(product.stock || 0) > 0 && Number(product.stock || 0) <= 3).length,
      tone: 'danger',
    },
    {
      label: 'Atenção',
      value: products.filter(
        (product) => Number(product.stock || 0) > 3 && Number(product.stock || 0) <= 10,
      ).length,
      tone: 'warning',
    },
    {
      label: 'Saudável',
      value: products.filter((product) => Number(product.stock || 0) > 10).length,
      tone: 'success',
    },
  ];

  const orderStatusDistribution = [
    { label: 'Pagos', value: paidOrders.length, tone: 'success' },
    { label: 'Pendentes', value: pendingOrders.length, tone: 'warning' },
    { label: 'Cancelados', value: canceledOrders.length, tone: 'danger' },
    { label: 'Etiqueta gerada', value: labelGeneratedOrders.length, tone: 'accent' },
    { label: 'Enviados', value: shippedOrders.length, tone: 'accent' },
    { label: 'Entregues', value: deliveredOrders.length, tone: 'success' },
    { label: 'Outros', value: failedOrders.length + unknownStatusOrders.length, tone: 'neutral' },
  ];

  const customerSourceMap = customers.reduce((map, customer) => {
    const source = normalizeCustomerSource(customer.leadSource);
    map.set(source, (map.get(source) || 0) + 1);
    return map;
  }, new Map());

  const customerSourceDistribution = [...customerSourceMap.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 5);

  const revenueByStatus = [
    { label: 'Receita confirmada', value: paidRevenue, tone: 'success' },
    { label: 'Receita em aberto', value: pendingRevenue, tone: 'warning' },
    { label: 'Perda por cancelamento', value: canceledRevenue, tone: 'danger' },
  ];

  const topInventoryProducts = [...products]
    .map((product) => ({
      id: product.id,
      name: product.name || 'Produto sem nome',
      stock: Number(product.stock || 0),
      inventoryValue: Number(product.price || 0) * Number(product.stock || 0),
    }))
    .sort((left, right) => right.inventoryValue - left.inventoryValue)
    .slice(0, 5);

  const topCategoriesByStock = [
    ...products
      .reduce((map, product) => {
        const categoryId = Number(product.categoryId || product.category?.id || 0);
        const categoryName = normalizeCategoryLabel(
          categoryLookup.get(categoryId) ||
            product.category?.name ||
            (categoryId ? `Categoria ${categoryId}` : 'Sem categoria'),
        );

        const current = map.get(categoryName) || { label: categoryName, stock: 0, products: 0 };
        current.stock += Number(product.stock || 0);
        current.products += 1;
        map.set(categoryName, current);
        return map;
      }, new Map())
      .values(),
  ]
    .sort((left, right) => right.stock - left.stock)
    .slice(0, 5);

  const highestOrder = orders.reduce((highest, order) => {
    return Number(order.total || 0) > Number(highest?.total || 0) ? order : highest;
  }, null);

  const today = startOfDay(new Date());
  const last7DaysTimeline = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    const dayStart = date.getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;

    const ordersInDay = orders.filter((order) => {
      const orderDate = new Date(order.createdAt || 0).getTime();
      return orderDate >= dayStart && orderDate < dayEnd;
    });

    return {
      label: formatDayLabel(date),
      weekday: formatWeekdayLabel(date),
      orders: ordersInDay.length,
      paidOrders: ordersInDay.filter((order) => PAID_ORDER_STATUSES.has(normalizeStatus(order.status))).length,
      pendingOrders: ordersInDay.filter((order) => PENDING_ORDER_STATUSES.has(normalizeStatus(order.status))).length,
      canceledOrders: ordersInDay.filter((order) => CANCELED_ORDER_STATUSES.has(normalizeStatus(order.status))).length,
      paidRevenue: ordersInDay
        .filter((order) => PAID_ORDER_STATUSES.has(normalizeStatus(order.status)))
        .reduce((sum, order) => sum + Number(order.total || 0), 0),
      customers: customers.filter((customer) => {
        const customerDate = new Date(customer.createdAt || 0).getTime();
        return customerDate >= dayStart && customerDate < dayEnd;
      }).length,
    };
  });

  const weekdayOrderHeatmap = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(
    (label, weekdayIndex) => {
      const value = orders.filter((order) => {
        const date = new Date(order.createdAt || 0);
        return date.getDay() === weekdayIndex;
      }).length;

      return { label, value };
    },
  );

  const categoriesWithProducts = categoryDistribution.reduce(
    (sum, category) => sum + (category.value > 0 ? 1 : 0),
    0,
  );
  const emptyCategories = Math.max(0, (categories.length || categoryMap.size) - categoriesWithProducts);
  const cancellationRate = safePercent(canceledOrders.length, orders.length);
  const pendingRate = safePercent(pendingOrders.length, orders.length);
  const paymentConfirmationRate = safePercent(paidOrders.length, orders.length);
  const customerPurchaseRate = safePercent(customersWithOrders, customers.length);
  const confirmedRevenueShare = safePercent(paidRevenue, potentialRevenue);
  const canceledRevenueShare = safePercent(canceledRevenue, potentialRevenue);

  const conversionStages = [
    { label: 'Clientes cadastrados', value: customers.length, baseValue: customers.length, previousValue: customers.length, tone: 'neutral' },
    { label: 'Clientes compradores', value: customersWithOrders, baseValue: customers.length, previousValue: customers.length, tone: 'warning' },
    { label: 'Pedidos criados', value: orders.length, baseValue: customers.length, previousValue: customersWithOrders, tone: 'accent' },
    { label: 'Pedidos pagos', value: paidOrders.length, baseValue: customers.length, previousValue: orders.length, tone: 'success' },
    { label: 'Pedidos aguardando envio/etiqueta', value: awaitingShippingOrders.length, baseValue: customers.length, previousValue: paidOrders.length, tone: 'warning' },
    { label: 'Pedidos enviados', value: shippedOrders.length, baseValue: customers.length, previousValue: awaitingShippingOrders.length || paidOrders.length, tone: 'accent' },
    { label: 'Pedidos entregues', value: deliveredOrders.length, baseValue: customers.length, previousValue: shippedOrders.length, tone: 'success' },
  ];

  const summary = {
    totalProducts: products.length,
    totalCategories: categories.length || categoryMap.size,
    categoriesWithProducts,
    emptyCategories,
    totalCustomers: customers.length,
    customersWithOrders,
    customersWithPaidOrders,
    totalOrders: orders.length,
    totalStock,
    lowStockCount,
    inventoryValue,
    paidOrders: paidOrders.length,
    pendingOrders: pendingOrders.length,
    canceledOrders: canceledOrders.length,
    failedOrders: failedOrders.length,
    unknownStatusCount: unknownStatusOrders.length,
    awaitingActionOrders: pendingOrders.length + awaitingShippingOrders.length,
    awaitingShippingOrders: awaitingShippingOrders.length,
    labelGeneratedOrders: labelGeneratedOrders.length,
    shippedOrders: shippedOrders.length,
    deliveredOrders: deliveredOrders.length,
    paidRevenue,
    pendingRevenue,
    canceledRevenue,
    potentialRevenue,
    averageTicket,
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
    stockByBand,
    orderStatusDistribution,
    customerSourceDistribution,
    revenueByStatus,
    topInventoryProducts,
    topCategoriesByStock,
    categoryWithMostProducts: categoryDistribution[0] || null,
    categoryWithMostStock: topCategoriesByStock[0] || null,
    last7DaysTimeline,
    timelineInsights: buildTimelineInsights(last7DaysTimeline),
    weekdayOrderHeatmap,
    conversionStages,
    formattedPaidRevenue: formatCurrencyBRL(paidRevenue),
    formattedPendingRevenue: formatCurrencyBRL(pendingRevenue),
    formattedCancellationRate: formatPercentBR(cancellationRate),
  };

  const automaticInsights = buildAutomaticInsights({
    ...summary,
    mostFrequentCustomerOrders,
  });

  return {
    ...summary,
    operationalAlerts: buildOperationalAlerts(summary),
    automaticInsights,
    automaticAnalysisText: buildAutomaticAnalysisText(summary),
  };
}

export function normalizeDashboardSummary(serverSummary) {
  if (!serverSummary || typeof serverSummary !== 'object') {
    return null;
  }

  const summary = {
    ...serverSummary,
    totalProducts: Number(serverSummary.totalProducts || 0),
    totalCategories: Number(serverSummary.totalCategories || 0),
    categoriesWithProducts: Number(serverSummary.categoriesWithProducts || 0),
    emptyCategories: Number(serverSummary.emptyCategories || 0),
    totalCustomers: Number(serverSummary.totalCustomers || 0),
    customersWithOrders: Number(serverSummary.customersWithOrders || 0),
    customersWithPaidOrders: Number(serverSummary.customersWithPaidOrders || 0),
    totalOrders: Number(serverSummary.totalOrders || 0),
    totalStock: Number(serverSummary.totalStock || 0),
    lowStockCount: Number(serverSummary.lowStockCount || 0),
    paidOrders: Number(serverSummary.paidOrders || 0),
    pendingOrders: Number(serverSummary.pendingOrders || 0),
    canceledOrders: Number(serverSummary.canceledOrders || 0),
    failedOrders: Number(serverSummary.failedOrders || 0),
    unknownStatusCount: Number(serverSummary.unknownStatusCount || 0),
    awaitingShippingOrders: Number(serverSummary.awaitingShippingOrders || 0),
    labelGeneratedOrders: Number(serverSummary.labelGeneratedOrders || 0),
    shippedOrders: Number(serverSummary.shippedOrders || 0),
    deliveredOrders: Number(serverSummary.deliveredOrders || 0),
    paidRevenue: Number(serverSummary.paidRevenue || 0),
    pendingRevenue: Number(serverSummary.pendingRevenue || 0),
    canceledRevenue: Number(serverSummary.canceledRevenue || 0),
    potentialRevenue: Number(serverSummary.potentialRevenue || 0),
    averageTicket: Number(serverSummary.averageTicket || 0),
    inventoryValue: Number(serverSummary.inventoryValue || 0),
    cancellationRate: Number(serverSummary.cancellationRate || 0),
    pendingRate: Number(serverSummary.pendingRate || 0),
    paymentConfirmationRate: Number(serverSummary.paymentConfirmationRate || serverSummary.paymentConversionRate || 0),
    paymentConversionRate: Number(serverSummary.paymentConversionRate || serverSummary.paymentConfirmationRate || 0),
    customerPurchaseRate: Number(serverSummary.customerPurchaseRate || 0),
    confirmedRevenueShare: Number(serverSummary.confirmedRevenueShare || 0),
    canceledRevenueShare: Number(serverSummary.canceledRevenueShare || 0),
    categoryDistribution: normalizeCollection(serverSummary.categoryDistribution),
    stockByBand: normalizeCollection(serverSummary.stockByBand),
    customerSourceDistribution: normalizeCollection(serverSummary.customerSourceDistribution),
    revenueByStatus: normalizeCollection(serverSummary.revenueByStatus),
    topInventoryProducts: normalizeCollection(serverSummary.topInventoryProducts),
    topCategoriesByStock: normalizeCollection(serverSummary.topCategoriesByStock),
    last7DaysTimeline: normalizeCollection(serverSummary.last7DaysTimeline),
    timelineInsights: normalizeCollection(serverSummary.timelineInsights),
    weekdayOrderHeatmap: normalizeCollection(serverSummary.weekdayOrderHeatmap),
    conversionStages: normalizeCollection(serverSummary.conversionStages),
  };

  summary.orderStatusDistribution = [
    { label: 'Pagos', value: summary.paidOrders, tone: 'success' },
    { label: 'Pendentes', value: summary.pendingOrders, tone: 'warning' },
    { label: 'Cancelados', value: summary.canceledOrders, tone: 'danger' },
    { label: 'Etiqueta gerada', value: summary.labelGeneratedOrders, tone: 'accent' },
    { label: 'Enviados', value: summary.shippedOrders, tone: 'accent' },
    { label: 'Entregues', value: summary.deliveredOrders, tone: 'success' },
    { label: 'Outros', value: summary.failedOrders + summary.unknownStatusCount, tone: 'neutral' },
  ];

  summary.formattedPaidRevenue = formatCurrencyBRL(summary.paidRevenue);
  summary.formattedPendingRevenue = formatCurrencyBRL(summary.pendingRevenue);
  summary.formattedCancellationRate = formatPercentBR(summary.cancellationRate);
  summary.operationalAlerts = buildOperationalAlerts(summary);
  summary.automaticInsights = buildAutomaticInsights({
    ...summary,
    mostFrequentCustomerOrders: Number(serverSummary.mostFrequentCustomerOrders || 0),
  });
  summary.automaticAnalysisText = buildAutomaticAnalysisText(summary);

  return summary;
}
