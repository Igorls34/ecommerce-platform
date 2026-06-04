import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { LoadingSpinner } from '../components/LoadingSpinner';
import { brandAssets } from '../lib/brandAssets';
import { resolveAssetUrl } from '../lib/assets';
import { formatCurrency } from '../lib/formatters';
import {
  getStoreCustomerAvailabilityLeads,
  getStoreCustomerOrders,
  getStoreCustomerProfile,
  updateStoreCustomerDefaultAddress,
} from '../services/api';
import { useStoreAuth } from '../state/StoreAuthContext';

const STATUS_LABELS = {
  PENDING: 'Aguardando pagamento',
  PAID: 'Aguardando separação',
  PAID_STOCK_ISSUE: 'Revisão de estoque',
  PREPARING: 'Em separação',
  PACKED: 'Embalado',
  LABEL_GENERATED: 'Etiqueta gerada',
  POSTED: 'Postado',
  SHIPPED: 'Em transporte',
  DELIVERED: 'Entregue',
  CANCELED: 'Cancelado',
};

const INITIAL_VISIBLE_ORDERS = 5;

function formatDate(value) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
  }).format(new Date(value));
}

function isPaymentExpired(order) {
  return order.status === 'PENDING' && order.paymentExpiresAt && new Date(order.paymentExpiresAt).getTime() <= Date.now();
}

function getOrderAction(order) {
  if (order.status === 'PENDING') {
    if (isPaymentExpired(order)) {
      return { type: 'expired', label: 'Pagamento expirado' };
    }

    return { type: 'link', label: 'Continuar pagamento' };
  }

  if (order.status === 'CANCELED') {
    return { type: 'expired', label: 'Cancelado' };
  }

  return { type: 'link', label: 'Acompanhar pedido' };
}

function getInitials(name) {
  return String(name || 'Cliente')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function getStatusClassName(status) {
  const normalizedStatus = String(status || '').toLowerCase().replace(/_/g, '-');

  return `account-status-chip account-status-chip--${normalizedStatus || 'pending'}`;
}

function getNextStep(orders, availabilityLeads) {
  const pendingPayment = orders.find((order) => order.status === 'PENDING' && !isPaymentExpired(order));
  const activeOrder = orders.find((order) => !['DELIVERED', 'CANCELED'].includes(order.status));
  const availableLead = availabilityLeads.find((lead) => Number(lead.product?.stock || 0) > 0);

  if (pendingPayment) {
    return {
      title: `Pedido #${pendingPayment.id} aguardando pagamento`,
      copy: 'Finalize o pagamento para a loja seguir com a separação.',
      actionLabel: 'Continuar pagamento',
      to: `/checkout/pagamento/${pendingPayment.id}`,
    };
  }

  if (activeOrder) {
    return {
      title: `Pedido #${activeOrder.id} em andamento`,
      copy: STATUS_LABELS[activeOrder.status] || 'Acompanhe o andamento do seu pedido.',
      actionLabel: 'Acompanhar pedido',
      to: `/checkout/pagamento/${activeOrder.id}`,
    };
  }

  if (availableLead) {
    return {
      title: 'Produto voltou para o estoque',
      copy: `${availableLead.product?.name || 'Um produto salvo'} pode estar disponível novamente.`,
      actionLabel: 'Ver produto',
      to: `/produtos/${availableLead.productId}`,
    };
  }

  return {
    title: 'Sua conta está em dia',
    copy: 'Explore a vitrine para encontrar novas peças e salvar seus próximos favoritos.',
    actionLabel: 'Ver produtos',
    to: '/produtos',
  };
}

export function CustomerAccountPage() {
  const { token, customer, isAuthenticated, isLoadingAuth, logout } = useStoreAuth();
  const [profile, setProfile] = useState(customer);
  const [orders, setOrders] = useState([]);
  const [availabilityLeads, setAvailabilityLeads] = useState([]);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState('');
  const [addressFeedback, setAddressFeedback] = useState('');
  const [addressBusy, setAddressBusy] = useState(false);
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [addressForm, setAddressForm] = useState({
    zipCode: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
  });

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return undefined;
    }

    let active = true;
    setLoading(true);

    Promise.allSettled([
      getStoreCustomerProfile(token),
      getStoreCustomerOrders(token),
      getStoreCustomerAvailabilityLeads(token),
    ])
      .then(([profileResult, ordersResult, leadsResult]) => {
        if (!active) {
          return;
        }

        if (profileResult.status === 'fulfilled') {
          const profileData = profileResult.value;
          setProfile(profileData);
          setAddressForm({
            zipCode: profileData.defaultAddress?.zipCode || '',
            street: profileData.defaultAddress?.street || '',
            number: profileData.defaultAddress?.number || '',
            complement: profileData.defaultAddress?.complement || '',
            neighborhood: profileData.defaultAddress?.neighborhood || '',
            city: profileData.defaultAddress?.city || '',
            state: profileData.defaultAddress?.state || '',
          });
        }

        setOrders(ordersResult.status === 'fulfilled' ? ordersResult.value : []);
        setAvailabilityLeads(leadsResult.status === 'fulfilled' ? leadsResult.value : []);

        const hasFailure = [profileResult, ordersResult, leadsResult].some(
          (result) => result.status === 'rejected',
        );

        setError(
          hasFailure
            ? 'Não foi possível carregar alguns dados agora. Tente atualizar a página em instantes.'
            : '',
        );
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [token]);

  const stats = useMemo(
    () => ({
      orders: orders.length,
      activeOrders: orders.filter((order) => !['DELIVERED', 'CANCELED'].includes(order.status))
        .length,
      pendingPayments: orders.filter((order) => order.status === 'PENDING' && !isPaymentExpired(order)).length,
    }),
    [orders],
  );
  const nextStep = useMemo(() => getNextStep(orders, availabilityLeads), [orders, availabilityLeads]);
  const visibleOrders = showAllOrders ? orders : orders.slice(0, INITIAL_VISIBLE_ORDERS);
  const hiddenOrdersCount = Math.max(orders.length - visibleOrders.length, 0);

  function updateAddressField(field, value) {
    setAddressForm((current) => ({
      ...current,
      [field]: field === 'state' ? value.toUpperCase().slice(0, 2) : value,
    }));
  }

  async function handleAddressSubmit(event) {
    event.preventDefault();

    if (!token) {
      return;
    }

    setAddressBusy(true);
    setAddressFeedback('');

    try {
      const updatedProfile = await updateStoreCustomerDefaultAddress(token, addressForm);
      setProfile(updatedProfile);
      setAddressFeedback('Endereço salvo.');
    } catch (requestError) {
      setAddressFeedback(requestError.message || 'Não foi possível salvar o endereço.');
    } finally {
      setAddressBusy(false);
    }
  }

  if (isLoadingAuth) {
    return (
      <div className="page-stack">
        <section className="empty-panel">
          <p className="section-eyebrow">Minha conta</p>
          <LoadingSpinner variant="spinner" text="Verificando sua sessão..." />
        </section>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="page-stack">
        <section className="empty-panel">
          <p className="section-eyebrow">Minha conta</p>
          <h1>Entre para acessar seu painel.</h1>
          <p>Veja seus pedidos, dados salvos e produtos aguardando reposição.</p>
          <Link to="/entrar" className="button-primary">
            Entrar
          </Link>
          <Link to="/produtos" className="button-secondary button-secondary-dark">
            Continuar comprando
          </Link>
        </section>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-stack">
        <section className="empty-panel">
          <p className="section-eyebrow">Minha conta</p>
          <LoadingSpinner variant="dots" text="Carregando seu painel..." />
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack account-dashboard">
      <section className="account-dashboard-hero">
        <div className="account-hero-profile">
          <div className="account-hero-avatar" aria-hidden="true">
            {getInitials(profile?.name)}
          </div>
          <div>
            <img
              src={brandAssets.logoHorizontalOffWhite}
              alt="Thessara"
              className="account-hero-brand"
              decoding="async"
            />
            <p className="section-eyebrow">Minha conta</p>
            <h1>Olá, {profile?.name?.split(' ')[0] || 'cliente'}.</h1>
            <p>Acompanhe seus pedidos, pagamentos e dados essenciais de entrega.</p>
          </div>
        </div>

        <div className="account-hero-aside">
          <div className="account-dashboard-actions">
            <Link to="/produtos" className="button-primary">
              Ver produtos
            </Link>
            <button type="button" className="button-secondary button-secondary-dark" onClick={logout}>
              Sair
            </button>
          </div>
        </div>
      </section>

      {error ? <div className="feedback-error">{error}</div> : null}

      <section className="account-overview-grid account-overview-grid-minimal" aria-label="Resumo da conta">
        <article className="account-next-step-card">
          <span>Agora</span>
          <strong>{nextStep.title}</strong>
          <p>{nextStep.copy}</p>
          <Link to={nextStep.to} className="inline-link">
            {nextStep.actionLabel}
          </Link>
        </article>
        <article>
          <span>Pedidos</span>
          <strong>{stats.activeOrders}</strong>
          <p>
            {stats.pendingPayments > 0
              ? `${stats.pendingPayments} pagamento pendente`
              : 'Nenhuma pendencia de pagamento'}
          </p>
        </article>
      </section>

      <section className="content-panel account-dashboard-card account-orders-panel">
        <div className="account-dashboard-card-heading">
          <div>
            <p className="section-eyebrow">Compras</p>
            <h2>Meus pedidos</h2>
          </div>
          <Link to="/carrinho" className="inline-link">
            Ir ao carrinho
          </Link>
        </div>

        {orders.length ? (
          <>
            <div className="account-orders-summary">
              <span>
                Mostrando {visibleOrders.length} de {orders.length} pedido
                {orders.length === 1 ? '' : 's'}
              </span>
              {orders.length > INITIAL_VISIBLE_ORDERS ? (
                <button
                  type="button"
                  className="link-button"
                  onClick={() => setShowAllOrders((current) => !current)}
                >
                  {showAllOrders ? 'Mostrar menos' : `Ver mais ${hiddenOrdersCount}`}
                </button>
              ) : null}
            </div>

            <div className="account-orders-list account-orders-list-compact">
              {visibleOrders.map((order) => {
                const action = getOrderAction(order);

                return (
                  <details key={order.id} className="account-order-card account-order-card-compact">
                    <summary>
                      <div className="account-order-main">
                        <strong>Pedido #{order.id}</strong>
                        <span>{formatDate(order.createdAt)}</span>
                      </div>
                      <strong className={getStatusClassName(order.status)}>
                        {STATUS_LABELS[order.status] || 'Status do pedido'}
                      </strong>
                      <strong className="account-order-total">{formatCurrency(order.total)}</strong>
                      <span className="account-order-toggle" aria-hidden="true">
                        Detalhes
                      </span>
                    </summary>

                    <div className="account-order-details">
                      <div>
                        <span>Status</span>
                        <strong>{STATUS_LABELS[order.status] || 'Status não informado'}</strong>
                      </div>
                      <div>
                        <span>Pedido criado em</span>
                        <strong>{formatDate(order.createdAt)}</strong>
                      </div>
                      <div>
                        <span>Total</span>
                        <strong>{formatCurrency(order.total)}</strong>
                      </div>
                      <div className="account-order-detail-action">
                        {action.type === 'link' ? (
                          <Link to={`/checkout/pagamento/${order.id}`} className="button-secondary">
                            {action.label}
                          </Link>
                        ) : (
                          <span className="account-order-action-muted">{action.label}</span>
                        )}
                      </div>
                      {order.items?.length ? (
                        <div className="account-order-items">
                          {order.items.map((item) => (
                            <div key={item.id} className="account-order-item">
                              <div className="account-order-item-image">
                                {item.product?.imageUrl ? (
                                  <img src={resolveAssetUrl(item.product.imageUrl)} alt={item.product.name} />
                                ) : (
                                  <span>Sem imagem</span>
                                )}
                              </div>
                              <div className="account-order-item-info">
                                <strong>{item.product?.name || `Produto #${item.productId}`}</strong>
                                {item.variant?.name ? <span>{item.variant.name}</span> : null}
                                <span>{item.quantity} x {formatCurrency(item.price)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </details>
                );
              })}
            </div>
          </>
        ) : (
          <div className="account-empty-state">
            <strong>Nenhum pedido ainda</strong>
            <p>Quando uma compra for criada, ela aparece aqui com pagamento e acompanhamento.</p>
            <Link to="/produtos" className="button-primary">
              Explorar produtos
            </Link>
          </div>
        )}
      </section>

      <section className="account-dashboard-grid account-dashboard-grid-minimal">
        <article className="content-panel account-dashboard-card">
          <div className="account-dashboard-card-heading">
            <div>
              <p className="section-eyebrow">Dados</p>
              <h2>Contato</h2>
            </div>
          </div>
          <dl className="account-profile-list">
            <div>
              <dt>Nome</dt>
              <dd>{profile?.name || '-'}</dd>
            </div>
            <div>
              <dt>E-mail</dt>
              <dd>{profile?.email || '-'}</dd>
            </div>
            <div>
              <dt>Telefone</dt>
              <dd>{profile?.phone || 'Não informado'}</dd>
            </div>
          </dl>
        </article>

        <details className="content-panel account-dashboard-card account-settings-card">
          <summary>
            <div>
              <p className="section-eyebrow">Entrega</p>
              <h2>Endereço principal</h2>
            </div>
            <span>Editar</span>
          </summary>
          <form className="account-address-form" onSubmit={handleAddressSubmit}>
            <div className="account-address-grid">
              <label>
                <span>CEP</span>
                <input
                  value={addressForm.zipCode}
                  onChange={(event) => updateAddressField('zipCode', event.target.value)}
                  placeholder="00000-000"
                />
              </label>
              <label>
                <span>Numero</span>
                <input
                  value={addressForm.number}
                  onChange={(event) => updateAddressField('number', event.target.value)}
                  placeholder="123"
                />
              </label>
            </div>
            <label>
              <span>Logradouro</span>
              <input
                value={addressForm.street}
                onChange={(event) => updateAddressField('street', event.target.value)}
                placeholder="Rua, avenida ou travessa"
              />
            </label>
            <div className="account-address-grid">
              <label>
                <span>Bairro</span>
                <input
                  value={addressForm.neighborhood}
                  onChange={(event) => updateAddressField('neighborhood', event.target.value)}
                  placeholder="Bairro"
                />
              </label>
              <label>
                <span>Complemento</span>
                <input
                  value={addressForm.complement}
                  onChange={(event) => updateAddressField('complement', event.target.value)}
                  placeholder="Apto, bloco"
                />
              </label>
            </div>
            <div className="account-address-grid">
              <label>
                <span>Cidade</span>
                <input
                  value={addressForm.city}
                  onChange={(event) => updateAddressField('city', event.target.value)}
                  placeholder="Cidade"
                />
              </label>
              <label>
                <span>UF</span>
                <input
                  value={addressForm.state}
                  onChange={(event) => updateAddressField('state', event.target.value)}
                  placeholder="SP"
                  maxLength={2}
                />
              </label>
            </div>
            {addressFeedback ? <div className="checkout-inline-feedback">{addressFeedback}</div> : null}
            <button type="submit" className="button-primary" disabled={addressBusy}>
              {addressBusy ? 'Salvando...' : 'Salvar endereço'}
            </button>
          </form>
        </details>
      </section>
    </div>
  );
}
