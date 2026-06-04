import { describe, expect, it } from 'vitest';

import { buildDashboardSummary } from './dashboard';

describe('buildDashboardSummary', () => {
  it('calcula totais, operacao e distribuicoes do dashboard', () => {
    const summary = buildDashboardSummary({
      products: [
        {
          id: 1,
          stock: 2,
          price: 10,
          categoryId: 1,
          category: { id: 1, name: 'Aneis' },
          name: 'Anel',
        },
        {
          id: 2,
          stock: 8,
          price: 5.5,
          categoryId: 2,
          category: { id: 2, name: 'Colares' },
          name: 'Colar',
        },
      ],
      categories: [
        { id: 1, name: 'Aneis' },
        { id: 2, name: 'Colares' },
      ],
      customers: [
        { id: 1, leadSource: 'google' },
        { id: 2, leadSource: 'store_form' },
      ],
      orders: [
        { id: 9, total: '120.00', status: 'PAID', customer: { name: 'Maria' } },
        { id: 10, total: '50.00', status: 'PENDING', customer: { name: 'Ana' } },
      ],
    });

    expect(summary.totalProducts).toBe(2);
    expect(summary.totalCategories).toBe(2);
    expect(summary.totalCustomers).toBe(2);
    expect(summary.totalOrders).toBe(2);
    expect(summary.totalStock).toBe(10);
    expect(summary.lowStockCount).toBe(1);
    expect(summary.inventoryValue).toBe(64);
    expect(summary.paidRevenue).toBe(120);
    expect(summary.pendingRevenue).toBe(50);
    expect(summary.potentialRevenue).toBe(170);
    expect(summary.averageTicket).toBe(120);
    expect(summary.highestOrderValue).toBe(120);
    expect(summary.highestOrderCustomer).toBe('Maria');
    expect(summary.paymentConversionRate).toBe(50);
    expect(summary.pendingRate).toBe(50);
    expect(summary.categoriesWithProducts).toBe(2);
    expect(summary.emptyCategories).toBe(0);
    expect(summary.categoryDistribution).toEqual([
      { label: 'Aneis', value: 1 },
      { label: 'Colares', value: 1 },
    ]);
    expect(summary.orderStatusDistribution).toEqual([
      { label: 'Pagos', value: 1, tone: 'success' },
      { label: 'Pendentes', value: 1, tone: 'warning' },
      { label: 'Cancelados', value: 0, tone: 'danger' },
      { label: 'Etiqueta gerada', value: 0, tone: 'accent' },
      { label: 'Enviados', value: 0, tone: 'accent' },
      { label: 'Entregues', value: 0, tone: 'success' },
      { label: 'Outros', value: 0, tone: 'neutral' },
    ]);
    expect(summary.customerSourceDistribution).toEqual([
      { label: 'Google', value: 1 },
      { label: 'Formulário', value: 1 },
    ]);
    expect(summary.topInventoryProducts).toEqual([
      { id: 2, name: 'Colar', stock: 8, inventoryValue: 44 },
      { id: 1, name: 'Anel', stock: 2, inventoryValue: 20 },
    ]);
    expect(summary.conversionStages.map((item) => item.label)).toEqual([
      'Clientes cadastrados',
      'Clientes compradores',
      'Pedidos criados',
      'Pedidos pagos',
      'Pedidos aguardando envio/etiqueta',
      'Pedidos enviados',
      'Pedidos entregues',
    ]);
    expect(summary.operationalAlerts.length).toBeGreaterThan(0);
    expect(summary.automaticAnalysisText).toContain('Foram registrados 2 pedidos');
    expect(summary.automaticInsights.length).toBeGreaterThan(0);
    expect(summary.last7DaysTimeline).toHaveLength(7);
    expect(summary.weekdayOrderHeatmap).toHaveLength(7);
  });
});
