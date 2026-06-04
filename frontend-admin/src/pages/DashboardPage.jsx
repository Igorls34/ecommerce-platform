import { useState, useEffect } from 'react';
import { getProducts, getOrders } from '../services/api';
import { formatCurrency } from '../lib/formatters';

export function DashboardPage() {
  const [data, setData] = useState({ products: 0, orders: 0, revenue: 0, pendingOrders: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getProducts(), getOrders()])
      .then(([p, o]) => {
        const products = Array.isArray(p) ? p : p.data || [];
        const orders = Array.isArray(o) ? o : o.data || [];
        setData({
          products: products.length,
          orders: orders.length,
          revenue: orders.filter(x => x.status === 'PAID').reduce((s, x) => s + Number(x.total || 0), 0),
          pendingOrders: orders.filter(x => x.status === 'PENDING').length,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-5"><div className="spinner-border" /></div>;

  return (
    <div>
      <div className="page-header"><h2>Dashboard</h2></div>
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3"><div className="stat-card"><h3>{data.products}</h3><span>Produtos</span></div></div>
        <div className="col-6 col-md-3"><div className="stat-card"><h3>{data.orders}</h3><span>Pedidos</span></div></div>
        <div className="col-6 col-md-3"><div className="stat-card"><h3>{data.pendingOrders}</h3><span>Pendentes</span></div></div>
        <div className="col-6 col-md-3"><div className="stat-card"><h3>{formatCurrency(data.revenue)}</h3><span>Faturamento</span></div></div>
      </div>
    </div>
  );
}
