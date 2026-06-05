import { useState, useEffect } from 'react';
import { getProducts, getOrders } from '../services/api';
import { formatCurrency } from '../lib/formatters';

export function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getProducts(), getOrders()])
      .then(([p, o]) => {
        const products = Array.isArray(p) ? p : p.data || [];
        const orders = Array.isArray(o) ? o : o.data || [];
        const paid = orders.filter(x => x.status === 'PAID' || x.status === 'PREPARING' || x.status === 'POSTED' || x.status === 'DELIVERED');
        setData({
          products: products.filter(x => x.visible).length,
          orders: orders.length,
          pendingOrders: orders.filter(x => x.status === 'PENDING').length,
          revenue: paid.reduce((s, x) => s + Number(x.total || 0), 0),
          avgTicket: paid.length > 0 ? paid.reduce((s, x) => s + Number(x.total || 0), 0) / paid.length : 0,
          deliveredOrders: orders.filter(x => x.status === 'DELIVERED').length,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = data ? [
    { label: 'Produtos Ativos', value: data.products, icon: '📦', color: '#f5f5f5' },
    { label: 'Pedidos', value: data.orders, icon: '📋', color: '#f0f4ff' },
    { label: 'Aguardando Pgto', value: data.pendingOrders, icon: '⏳', color: '#fff7ed' },
    { label: 'Entregues', value: data.deliveredOrders, icon: '✅', color: '#ecfdf5' },
    { label: 'Faturamento', value: formatCurrency(data.revenue), icon: '💰', color: '#fefce8' },
    { label: 'Ticket Médio', value: formatCurrency(data.avgTicket), icon: '📊', color: '#fdf2f8' },
  ] : [];

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
      </div>
      <div className="row g-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="col-6 col-md-4 col-lg-4" style={{ animation: `fade-in-up 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 0.05}s both` }}>
              <div className="stat-card" style={{ background: '#f9fafb' }}>
                <div style={{ width: 80, height: 14, background: '#e5e5e5', borderRadius: 7, animation: 'skeleton-shimmer 1.5s ease-in-out infinite', backgroundSize: '200% 100%', backgroundImage: 'linear-gradient(90deg, #e5e5e5 25%, #d4d4d4 50%, #e5e5e5 75%)' }} />
                <div style={{ width: 40, height: 28, background: '#e5e5e5', borderRadius: 7, marginTop: 6, animation: 'skeleton-shimmer 1.5s ease-in-out infinite', backgroundSize: '200% 100%', backgroundImage: 'linear-gradient(90deg, #e5e5e5 25%, #d4d4d4 50%, #e5e5e5 75%)' }} />
              </div>
            </div>
          ))
        ) : (
          stats.map((s, i) => (
            <div key={s.label} className="col-6 col-md-4 col-lg-4" style={{ animation: `fade-in-up 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 0.06}s both` }}>
              <div className="stat-card" style={{ background: s.color }}>
                <span>{s.icon} {s.label}</span>
                <h3>{s.value}</h3>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
