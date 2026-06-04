import { formatCurrency, formatPercent, pluralize } from '../lib/formatters';

const MAIN_STATS = [
  {
    key: 'paidRevenue',
    title: 'Receita confirmada',
    icon: 'R$',
    value: (summary) => formatCurrency(summary.paidRevenue),
    subtitle: () => 'Valor já pago pelos clientes',
    accent: true,
  },
  {
    key: 'pendingRevenue',
    title: 'Receita em aberto',
    icon: 'R$',
    value: (summary) => formatCurrency(summary.pendingRevenue),
    subtitle: () => 'Pedidos aguardando pagamento',
  },
  {
    key: 'canceledRevenue',
    title: 'Perda por cancelamento',
    icon: '!',
    value: (summary) => formatCurrency(summary.canceledRevenue),
    subtitle: (summary) => `${formatPercent(summary.canceledRevenueShare)} do valor potencial`,
  },
  {
    key: 'totalOrders',
    title: 'Total de pedidos',
    icon: '#',
    value: (summary) => Number(summary.totalOrders || 0).toLocaleString('pt-BR'),
    subtitle: (summary) =>
      `${pluralize(summary.paidOrders, 'pago')} e ${pluralize(summary.pendingOrders, 'pendente')}`,
  },
  {
    key: 'paidOrders',
    title: 'Pedidos pagos',
    icon: 'OK',
    value: (summary) => Number(summary.paidOrders || 0).toLocaleString('pt-BR'),
    subtitle: (summary) => `${formatPercent(summary.paymentConfirmationRate)} dos pedidos`,
  },
  {
    key: 'pendingOrders',
    title: 'Pedidos pendentes',
    icon: '...',
    value: (summary) => Number(summary.pendingOrders || 0).toLocaleString('pt-BR'),
    subtitle: (summary) => `${formatPercent(summary.pendingRate)} dos pedidos`,
  },
  {
    key: 'canceledOrders',
    title: 'Pedidos cancelados',
    icon: 'X',
    value: (summary) => Number(summary.canceledOrders || 0).toLocaleString('pt-BR'),
    subtitle: (summary) => `${formatPercent(summary.cancellationRate)} dos pedidos`,
  },
  {
    key: 'averageTicket',
    title: 'Ticket médio',
    icon: 'TM',
    value: (summary) => formatCurrency(summary.averageTicket),
    subtitle: (summary) => `Média dos ${pluralize(summary.paidOrders, 'pedido pago', 'pedidos pagos')}`,
  },
  {
    key: 'totalCustomers',
    title: 'Clientes',
    icon: 'C',
    value: (summary) => Number(summary.totalCustomers || 0).toLocaleString('pt-BR'),
    subtitle: (summary) =>
      `${pluralize(summary.customersWithOrders, 'comprador')} (${formatPercent(summary.customerPurchaseRate)})`,
  },
  {
    key: 'totalProducts',
    title: 'Produtos',
    icon: 'P',
    value: (summary) => Number(summary.totalProducts || 0).toLocaleString('pt-BR'),
    subtitle: (summary) => `${pluralize(summary.totalStock, 'item')} em estoque`,
  },
  {
    key: 'inventoryValue',
    title: 'Valor em estoque',
    icon: 'R$',
    value: (summary) => formatCurrency(summary.inventoryValue),
    subtitle: () => 'Capital parado no inventário',
  },
  {
    key: 'lowStockCount',
    title: 'Estoque em atenção',
    icon: 'E',
    value: (summary) => pluralize(summary.lowStockCount, 'produto'),
    subtitle: () => 'Reposição recomendada',
  },
  {
    key: 'totalCategories',
    title: 'Categorias',
    icon: 'G',
    value: (summary) => Number(summary.totalCategories || 0).toLocaleString('pt-BR'),
    subtitle: (summary) =>
      `${summary.categoriesWithProducts || 0} com produtos e ${summary.emptyCategories || 0} vazias`,
  },
];

export function StatsGrid({ summary }) {
  return (
    <section className="stats-grid">
      {MAIN_STATS.map((item) => (
        <article
          key={item.key}
          className={`stat-card${item.accent ? ' stat-card-accent' : ''}`}
        >
          <div className="stat-card-head">
            <div>
              <span className="stat-label">{item.title}</span>
            </div>
            <div className="stat-icon">{item.icon}</div>
          </div>
          <strong>{item.value(summary)}</strong>
          <small>{item.subtitle(summary)}</small>
        </article>
      ))}
    </section>
  );
}
