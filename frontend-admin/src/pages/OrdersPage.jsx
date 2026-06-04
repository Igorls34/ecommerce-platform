import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { AdminLayout } from '../components/AdminLayout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { formatCurrency } from '../lib/formatters';
import { getOrders } from '../services/api';

const ORDERS_PER_PAGE = 20;
const READY_STATUSES = ['PAID', 'PAID_STOCK_ISSUE', 'PREPARING', 'PACKED', 'LABEL_GENERATED'];
const STATUS_OPTIONS = [
  { value: 'ready', label: 'Fila de preparo' },
  { value: 'PENDING', label: 'Aguardando pagamento' },
  { value: 'POSTED', label: 'Postados' },
  { value: 'SHIPPED', label: 'Em transporte' },
  { value: 'DELIVERED', label: 'Entregues' },
  { value: 'CANCELED', label: 'Cancelados' },
  { value: 'all', label: 'Todos' },
];

const STATUS_FILTERS = [
  { value: 'ready', label: 'Preparo' },
  { value: 'PENDING', label: 'Pagamento' },
  { value: 'POSTED', label: 'Postados' },
  { value: 'SHIPPED', label: 'Transporte' },
  { value: 'DELIVERED', label: 'Entregues' },
  { value: 'CANCELED', label: 'Cancelados' },
  { value: 'all', label: 'Todos' },
];

function formatDate(value) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatStatus(status) {
  const labels = {
    PENDING: 'Pendente',
    PAID: 'Aguardando separacao',
    PAID_STOCK_ISSUE: 'Pago com ajuste de estoque',
    PREPARING: 'Separacao confirmada',
    PACKED: 'Embalado',
    LABEL_GENERATED: 'Etiqueta gerada',
    POSTED: 'Postado',
    CANCELED: 'Cancelado',
    SHIPPED: 'Em transporte',
    DELIVERED: 'Entregue',
  };

  return labels[status] || status || 'Sem status';
}

function statusClassName(status) {
  const normalizedStatus = String(status || '').toLowerCase();
  return `pill order-status-badge is-${normalizedStatus}`;
}

function countOrdersByStatus(orders, status) {
  return orders.filter((order) => order.status === status).length;
}

function countReadyOrders(orders) {
  return orders.filter((order) => READY_STATUSES.includes(order.status)).length;
}

function getCustomerLabel(order) {
  return order.customer?.name || 'Cliente sem nome';
}

function getCustomerContact(order) {
  return order.customer?.email || order.customer?.phone || 'Contato não informado';
}

function getOrderItemCount(order) {
  return order.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0;
}

function formatItemCount(order) {
  const count = getOrderItemCount(order);
  return count === 1 ? '1 item' : `${count} itens`;
}

function getStatusTone(status) {
  if (status === 'PENDING') {
    return 'warning';
  }

  if (['CANCELED', 'PAID_STOCK_ISSUE'].includes(status)) {
    return 'danger';
  }

  if (['DELIVERED', 'PAID', 'PREPARING', 'PACKED', 'LABEL_GENERATED'].includes(status)) {
    return 'success';
  }

  return 'neutral';
}

function buildNextActionLabel(order) {
  if (order.status === 'PENDING') {
    return 'Conferir pagamento';
  }

  if (['PAID', 'PAID_STOCK_ISSUE'].includes(order.status)) {
    return 'Separar pedido';
  }

  if (order.status === 'PREPARING') {
    return 'Embalar';
  }

  if (order.status === 'PACKED') {
    return 'Gerar etiqueta';
  }

  if (order.status === 'LABEL_GENERATED') {
    return 'Postar';
  }

  if (order.status === 'POSTED' || order.status === 'SHIPPED') {
    return 'Acompanhar entrega';
  }

  return 'Revisar pedido';
}

export function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ready');
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationMeta, setPaginationMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 350);

    return () => window.clearTimeout(timerId);
  }, [query]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedQuery, statusFilter]);

  useEffect(() => {
    let active = true;

    setLoading(true);
    getOrders({
      search: debouncedQuery,
      status: statusFilter === 'ready' || statusFilter === 'all' ? undefined : statusFilter,
      statusGroup: statusFilter === 'ready' ? 'ready' : undefined,
      page: currentPage,
      limit: ORDERS_PER_PAGE,
      paginated: true,
    })
      .then((data) => {
        if (!active) {
          return;
        }

        setOrders(data.items || []);
        setPaginationMeta(data.meta || null);
        setError('');
      })
      .catch((requestError) => {
        if (!active) {
          return;
        }

        setOrders([]);
        setError(requestError.message || 'Não foi possível carregar os pedidos.');
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [currentPage, debouncedQuery, statusFilter]);

  const summary = useMemo(
    () => ({
      total: paginationMeta?.total ?? orders.length,
      ready: countReadyOrders(orders),
      pending: countOrdersByStatus(orders, 'PENDING'),
      posted: countOrdersByStatus(orders, 'POSTED'),
      shipped: countOrdersByStatus(orders, 'SHIPPED'),
      delivered: countOrdersByStatus(orders, 'DELIVERED'),
    }),
    [orders, paginationMeta?.total],
  );

  const activeStatusLabel =
    STATUS_OPTIONS.find((option) => option.value === statusFilter)?.label || 'Pedidos';

  return (
    <AdminLayout
      title="Pedidos"
      subtitle="Pedidos, pagamentos e preparo"
    >
      {error ? <div className="panel feedback feedback-error">{error}</div> : null}

      <section className="orders-command-center panel page-summary">
        <div className="orders-command-copy">
          <p className="eyebrow">Operacao</p>
          <h3>{activeStatusLabel}</h3>
          <p>{loading ? <LoadingSpinner variant="dots" /> : `${summary.total} pedido(s) nesta visao.`}</p>
        </div>

        <div className="orders-kpi-strip" aria-label="Resumo de pedidos">
          <article>
            <span>Total</span>
            <strong>{summary.total}</strong>
          </article>
          <article>
            <span>Preparo</span>
            <strong>{summary.ready}</strong>
          </article>
          <article>
            <span>Pagamento</span>
            <strong>{summary.pending}</strong>
          </article>
          <article>
            <span>Entregues</span>
            <strong>{summary.delivered}</strong>
          </article>
        </div>

        <div className="orders-toolbar">
          <label className="orders-search-field">
            <span>Buscar</span>
            <input
              aria-label="Buscar pedidos"
              placeholder="Cliente, e-mail ou pedido"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <div className="orders-status-tabs" aria-label="Filtrar pedidos por status">
            {STATUS_FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={statusFilter === option.value ? 'is-active' : ''}
                onClick={() => setStatusFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="panel table-panel orders-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Pedidos</p>
            <h3>{activeStatusLabel}</h3>
          </div>
          <div className="table-summary">
            {loading ? <LoadingSpinner variant="dots" /> : `${paginationMeta?.total ?? orders.length} registro(s)`}
          </div>
        </div>

        {orders.length ? (
          <div className="orders-list">
            {orders.map((order) => (
              <article
                key={order.id}
                className={`order-list-card is-${getStatusTone(order.status)}`}
              >
                <div className="order-list-identity">
                  <strong>Pedido #{order.id}</strong>
                  <span>{getCustomerLabel(order)}</span>
                </div>

                <span className={statusClassName(order.status)}>{formatStatus(order.status)}</span>

                <div className="order-list-compact-meta">
                  <span>{formatDate(order.createdAt)}</span>
                  <span>{formatItemCount(order)}</span>
                </div>

                <strong className="order-list-total-value">{formatCurrency(order.total)}</strong>

                <div className="order-list-actions">
                  <span className="order-list-next">{buildNextActionLabel(order)}</span>
                  <Link
                    className="button button-primary order-list-action"
                    to={`/pedidos/${order.id}`}
                    aria-label={`Abrir pedido ${order.id} de ${getCustomerLabel(order)}. Contato: ${getCustomerContact(order)}`}
                  >
                    Abrir
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-copy empty-state">
            {loading ? <LoadingSpinner variant="dots" /> : 'Nenhum pedido encontrado com os filtros atuais.'}
          </p>
        )}
      </section>

      {paginationMeta && paginationMeta.totalPages > 1 ? (
        <div className="pagination-bar panel orders-pagination">
          <button
            type="button"
            className="button button-secondary"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
          >
            Anterior
          </button>
          <span className="table-summary">
            Pagina {paginationMeta.page} de {paginationMeta.totalPages}
          </span>
          <button
            type="button"
            className="button button-secondary"
            disabled={currentPage >= paginationMeta.totalPages}
            onClick={() =>
              setCurrentPage((page) => Math.min(paginationMeta.totalPages, page + 1))
            }
          >
            Proxima
          </button>
        </div>
      ) : null}
    </AdminLayout>
  );
}
