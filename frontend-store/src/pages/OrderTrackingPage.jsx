import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { LoadingSpinner } from '../components/LoadingSpinner';
import { formatCurrency } from '../lib/formatters';
import { getStoreOrderByTrackingToken } from '../services/api';

const STEPS = [
  { status: 'PAID', label: 'Pagamento aprovado' },
  { status: 'PREPARING', label: 'Em separação' },
  { status: 'PACKED', label: 'Embalado' },
  { status: 'LABEL_GENERATED', label: 'Etiqueta gerada' },
  { status: 'POSTED', label: 'Postado' },
  { status: 'SHIPPED', label: 'Em transporte' },
  { status: 'DELIVERED', label: 'Entregue' },
];

const STATUS_LABELS = {
  PENDING: 'Aguardando pagamento',
  PAID: 'Aguardando separação',
  PREPARING: 'Em separação',
  PACKED: 'Embalado',
  LABEL_GENERATED: 'Etiqueta gerada',
  POSTED: 'Postado',
  SHIPPED: 'Em transporte',
  DELIVERED: 'Entregue',
  CANCELED: 'Cancelado',
};

const PENDING_PAYMENT_STEPS = [
  { key: 'ORDER_CREATED', label: 'Pedido criado', state: 'done' },
  { key: 'PAYMENT_PENDING', label: 'Aguardando pagamento', state: 'current' },
];

function buildFulfillmentSteps(status) {
  if (status === 'PENDING') {
    return PENDING_PAYMENT_STEPS;
  }

  if (status === 'CANCELED') {
    return [
      { key: 'ORDER_CREATED', label: 'Pedido criado', state: 'done' },
      { key: 'PAYMENT_FAILED', label: 'Pedido cancelado', state: 'warning' },
    ];
  }

  const currentIndex = Math.max(
    0,
    STEPS.findIndex((step) => step.status === status),
  );

  return STEPS.map((step, index) => ({
    key: step.status,
    label: step.label,
    state: index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'pending',
  }));
}

function formatDate(value) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function OrderTrackingPage() {
  const { trackingToken } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    setLoading(true);
    getStoreOrderByTrackingToken(trackingToken)
      .then((data) => {
        if (!active) {
          return;
        }

        setOrder(data);
        setError('');
      })
      .catch((requestError) => {
        if (active) {
          setOrder(null);
          setError(requestError.message || 'Não foi possível carregar o acompanhamento.');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [trackingToken]);

  const trackingSteps = useMemo(() => buildFulfillmentSteps(order?.status), [order]);

  if (loading) {
    return (
      <div className="page-stack">
        <section className="empty-panel">
          <p className="section-eyebrow">Acompanhamento</p>
          <LoadingSpinner variant="dots" text="Carregando pedido..." />
        </section>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="page-stack">
        <section className="empty-panel">
          <p className="section-eyebrow">Acompanhamento</p>
          <h1>Não encontramos este pedido.</h1>
          <p>{error || 'Confira o link recebido por e-mail.'}</p>
          <Link to="/produtos" className="button-primary">
            Ver produtos
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="content-panel tracking-panel">
        <p className="section-eyebrow">Acompanhamento do pedido</p>
        <h1>Pedido #{order.id}</h1>
        <p>
          Status atual: <strong>{STATUS_LABELS[order.status] || order.status}</strong>
        </p>

        <div className={`tracking-steps${order.status === 'CANCELED' ? ' is-canceled' : ''}`}>
          {trackingSteps.map((step, index) => (
            <div
              key={step.key}
              className={`tracking-step is-${step.state}${['done', 'current'].includes(step.state) ? ' is-complete' : ''}`}
            >
              <span>{index + 1}</span>
              <strong>{step.label}</strong>
            </div>
          ))}
        </div>

        {order.status === 'CANCELED' ? (
          <div className="feedback-error">
            Este pedido foi cancelado ou o pagamento não foi aprovado.
          </div>
        ) : null}

        <div className="confirmation-meta">
          <div>
            <span>Total</span>
            <strong>{formatCurrency(order.total)}</strong>
          </div>
          <div>
            <span>Cliente</span>
            <strong>{order.customer?.name || '-'}</strong>
          </div>
          <div>
            <span>Última atualização</span>
            <strong>{formatDate(order.updatedAt)}</strong>
          </div>
        </div>

        {order.trackingCode || order.shippingNotes ? (
          <div className="tracking-shipping-box">
            <span>Entrega</span>
            {order.trackingCode ? <strong>Código: {order.trackingCode}</strong> : null}
            {order.shippingNotes ? <p>{order.shippingNotes}</p> : null}
          </div>
        ) : null}

        <div className="checkout-items confirmation-items">
          {order.items?.map((item) => (
            <div key={item.id} className="checkout-item">
              <span>
                {item.product?.name || `Produto #${item.productId}`}
                {item.variant?.name ? ` - ${item.variant.name}` : ''}
              </span>
              <strong>
                {item.quantity} x {formatCurrency(item.price)}
              </strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
