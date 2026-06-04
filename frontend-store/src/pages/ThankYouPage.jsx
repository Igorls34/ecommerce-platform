import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';

import { LoadingSpinner } from '../components/LoadingSpinner';
import { formatCurrency } from '../lib/formatters';
import { getStoreOrderById } from '../services/api';
import { useStoreAuth } from '../state/StoreAuthContext';

const STATUS_LABELS = {
  PENDING: 'Aguardando pagamento',
  PAID: 'Pagamento confirmado',
  PAID_STOCK_ISSUE: 'Revisão de estoque',
  PREPARING: 'Em preparação',
  PACKED: 'Embalado',
  LABEL_GENERATED: 'Etiqueta gerada',
  POSTED: 'Postado',
  SHIPPED: 'Em transporte',
  DELIVERED: 'Entregue',
  CANCELED: 'Cancelado',
};

export function ThankYouPage() {
  const { orderId } = useParams();
  const location = useLocation();
  const { token, customer, isAuthenticated, isLoadingAuth } = useStoreAuth();
  const [order, setOrder] = useState(location.state?.order || null);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    let active = true;

    async function loadOrder() {
      if (!orderId || !token || order) {
        return;
      }

      try {
        const data = await getStoreOrderById(token, orderId);

        if (active) {
          setOrder(data);
        }
      } catch (requestError) {
        if (active) {
          setFeedback(requestError.message || 'Não foi possível carregar o resumo do pedido.');
        }
      }
    }

    loadOrder();

    return () => {
      active = false;
    };
  }, [order, orderId, token]);

  if (isLoadingAuth) {
    return (
      <div className="page-stack">
        <section className="empty-panel">
          <p className="section-eyebrow">Obrigada</p>
          <LoadingSpinner variant="dots" text="Verificando sua sessão..." />
        </section>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="page-stack">
        <section className="empty-panel">
          <p className="section-eyebrow">Obrigada</p>
          <h1>Entre para ver o resumo do pedido.</h1>
          <p>Sua conta mantém o histórico da compra e as atualizações de envio protegidas.</p>
          <Link
            to="/entrar"
            state={{ from: `/pedido/obrigada/${orderId}` }}
            className="button-primary"
          >
            Entrar
          </Link>
        </section>
      </div>
    );
  }

  if (feedback) {
    return (
      <div className="page-stack">
        <section className="empty-panel">
          <p className="section-eyebrow">Obrigada</p>
          <h1>Seu pedido foi recebido.</h1>
          <p>{feedback}</p>
          <Link to="/produtos" className="button-primary">
            Voltar para a vitrine
          </Link>
        </section>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="page-stack">
        <section className="empty-panel">
          <p className="section-eyebrow">Obrigada</p>
          <h1>Estamos preparando seu resumo.</h1>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="content-panel thank-you-panel">
        <p className="section-eyebrow">Compra finalizada</p>
        <h1>Obrigada por escolher a Thessara.</h1>
        <p className="thank-you-lead">
          {customer?.name || order.customer?.name
            ? `${customer?.name || order.customer?.name}, seu pedido foi confirmado com sucesso.`
            : 'Seu pedido foi confirmado com sucesso.'}{' '}
          Agora é só aguardar os próximos passos do atendimento.
        </p>

        <div className="thank-you-highlight-grid">
          <article>
            <span>Pedido</span>
            <strong>#{order.id}</strong>
          </article>
          <article>
            <span>Status</span>
            <strong>{STATUS_LABELS[order.status] || order.status}</strong>
          </article>
          <article>
            <span>Total</span>
            <strong>{formatCurrency(order.total)}</strong>
          </article>
        </div>

        <div className="thank-you-copy">
          <p>
            Cada joia da Thessara foi pensada para celebrar presença, feminilidade e momentos
            especiais. Seu pedido entrou em andamento e seguiremos com as próximas atualizações pelo
            contato cadastrado.
          </p>
          <p>
            Se quiser continuar explorando a coleção, a vitrine segue aberta com novas peças para
            presentear, combinar e marcar outras ocasiões importantes.
          </p>
        </div>

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

        <div className="confirmation-actions">
          <Link to="/produtos" className="button-primary">
            Continuar comprando
          </Link>
          <Link to="/sobre" className="button-secondary button-secondary-dark">
            Conhecer a marca
          </Link>
        </div>
      </section>
    </div>
  );
}
