import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getOrders } from '../services/api';
import { formatCurrency, formatDateBR } from '../lib/formatters';

const STATUS = { PENDING: 'Pendente', PAID: 'Pago', PREPARING: 'Separando', LABEL_GENERATED: 'Etiqueta', POSTED: 'Postado', SHIPPED: 'Enviado', DELIVERED: 'Entregue', CANCELED: 'Cancelado' };
const STATUS_COLOR = { PENDING: 'bg-warning text-dark', PAID: 'bg-success', PREPARING: 'bg-info text-dark', CANCELED: 'bg-danger', DELIVERED: 'bg-success' };

export function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    getOrders().then(d => setOrders(Array.isArray(d) ? d : d.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  return (
    <div>
      <div className="page-header"><h2>Pedidos</h2></div>
      <div className="d-flex gap-2 mb-3 flex-wrap">
        {[{k:'all',l:'Todos'},{k:'PENDING',l:'Pendentes'},{k:'PAID',l:'Pagos'},{k:'POSTED',l:'Postados'},{k:'DELIVERED',l:'Entregues'}].map(f => (
          <button key={f.k} className={`btn btn-sm ${filter === f.k ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setFilter(f.k)}>{f.l}</button>
        ))}
      </div>
      {loading ? <div className="text-center py-4"><div className="spinner-border" /></div> :
        <div className="card"><table className="table mb-0">
          <thead><tr><th>#</th><th>Cliente</th><th>Status</th><th>Total</th><th>Data</th><th></th></tr></thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id}>
                <td>#{o.id}</td>
                <td>{o.customer?.name || '-'}</td>
                <td><span className={`badge ${STATUS_COLOR[o.status] || 'bg-secondary'}`}>{STATUS[o.status] || o.status}</span></td>
                <td>{formatCurrency(o.total)}</td>
                <td className="text-muted small">{formatDateBR(o.createdAt)}</td>
                <td><Link className="btn btn-outline-dark btn-sm" to={`/pedidos/${o.id}`}>Ver</Link></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      }
    </div>
  );
}
