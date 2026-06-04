import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { AdminLayout } from '../components/AdminLayout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useToast } from '../components/Toast';
import { formatCurrency } from '../lib/formatters';
import { getCustomerById, updateCustomer } from '../services/api';

function formatDate(value) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function buildWhatsAppUrl(customer) {
  const phone = onlyDigits(customer?.phone);

  if (!phone) {
    return '';
  }

  const normalizedPhone = phone.startsWith('55') ? phone : `55${phone}`;
  const message = encodeURIComponent(`Ola, ${customer.name}. Tudo bem?`);
  return `https://wa.me/${normalizedPhone}?text=${message}`;
}

function formatLeadSource(value) {
  const source = String(value || '')
    .trim()
    .toLowerCase();

  const labels = {
    google: 'Google',
    store_register: 'Cadastro da loja',
    store_form: 'Formulario da loja',
    checkout: 'Checkout da loja',
    loja: 'Loja',
    store: 'Loja',
  };

  return labels[source] || (source ? source.replace(/_/g, ' ') : 'Loja');
}

function formatStatus(status) {
  const labels = {
    PENDING: 'Pendente',
    PAID: 'Aguardando separacao',
    PREPARING: 'Separacao confirmada',
    PACKED: 'Embalado',
    LABEL_GENERATED: 'Etiqueta gerada',
    POSTED: 'Postado',
    CANCELED: 'Cancelado',
    SHIPPED: 'Em transporte',
    DELIVERED: 'Entregue',
  };

  return labels[status] || status || '-';
}

export function CustomerDetailPage() {
  const { customerId } = useParams();
  const [customer, setCustomer] = useState(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    notifyWhatsApp: false,
    preferredContact: 'email',
    marketingOptIn: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    let active = true;

    setLoading(true);
    getCustomerById(customerId)
      .then((data) => {
        if (!active) {
          return;
        }

        setCustomer(data);
        setForm(buildCustomerForm(data));
        setError('');
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.message || 'Não foi possível carregar o cliente.');
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
  }, [customerId]);

  const stats = useMemo(() => {
    const orders = customer?.orders || [];
    const totalSpent = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);

    return {
      orders: orders.length,
      totalSpent,
      availabilityLeads: customer?.availabilityLeads?.length || 0,
    };
  }, [customer]);

  const whatsappUrl = buildWhatsAppUrl(customer);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const updatedCustomer = await updateCustomer(customerId, form);
      setCustomer(updatedCustomer);
      setForm(buildCustomerForm(updatedCustomer));
      showToast('Cadastro do cliente atualizado.', 'success');
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível atualizar o cliente.');
      showToast(requestError.message || 'Não foi possível atualizar o cliente.', 'error');
    } finally {
      setSaving(false);
    }
  }

  function updateFormField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  return (
    <AdminLayout
      title={customer ? customer.name : 'Cliente'}
      subtitle="Detalhes do cliente"
      actions={
        <Link className="button button-secondary" to="/clientes">
          Voltar para clientes
        </Link>
      }
    >
      {loading ? <LoadingSpinner variant="dual-ring" text="Carregando cliente..." /> : null}
      {error ? <div className="panel feedback feedback-error">{error}</div> : null}

      {customer ? (
        <>
          <section className="order-detail-grid">
            <article className="panel order-detail-card">
              <p className="eyebrow">Contato</p>
              <strong>{customer.email}</strong>
              <span>{customer.phone || 'Sem telefone'}</span>
              <div className="table-actions">
                <a className="button button-primary" href={`mailto:${customer.email}`}>
                  Contactar via email
                </a>
                {whatsappUrl ? (
                  <a
                    className="button button-secondary"
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Contactar via WhatsApp
                  </a>
                ) : (
                  <button type="button" className="button button-secondary button-unavailable">
                    WhatsApp indisponivel
                  </button>
                )}
              </div>
            </article>

            <article className="panel order-detail-card">
              <p className="eyebrow">Resumo</p>
              <strong>{stats.orders} pedido(s)</strong>
              <span>Total gasto: {formatCurrency(stats.totalSpent)}</span>
              <span>{stats.availabilityLeads} aviso(s) de estoque</span>
            </article>

            <article className="panel order-detail-card">
              <p className="eyebrow">Cadastro</p>
              <strong>{formatLeadSource(customer.leadSource)}</strong>
              <span>Criado em {formatDate(customer.createdAt)}</span>
              <span>Ultimo login {formatDate(customer.lastLoginAt)}</span>
            </article>
          </section>

          <section className="panel order-items-block">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Cliente</p>
                <h3>Dados cadastrais</h3>
              </div>
            </div>

            <form className="order-data-form" onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="customer-name">Nome</label>
                <input
                  id="customer-name"
                  value={form.name}
                  onChange={(event) => updateFormField('name', event.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="customer-email">E-mail</label>
                <input
                  id="customer-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => updateFormField('email', event.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="customer-phone">Telefone</label>
                <input
                  id="customer-phone"
                  value={form.phone}
                  onChange={(event) => updateFormField('phone', event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="customer-cpf">CPF/CNPJ</label>
                <input
                  id="customer-cpf"
                  value={form.cpf}
                  onChange={(event) => updateFormField('cpf', event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="customer-contact">Contato preferencial</label>
                <select
                  id="customer-contact"
                  value={form.preferredContact}
                  onChange={(event) => updateFormField('preferredContact', event.target.value)}
                >
                  <option value="email">E-mail</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </div>
              <label className="form-check">
                <input
                  type="checkbox"
                  checked={form.notifyWhatsApp}
                  onChange={(event) => updateFormField('notifyWhatsApp', event.target.checked)}
                />
                <span>Aceita notificações por WhatsApp</span>
              </label>
              <label className="form-check">
                <input
                  type="checkbox"
                  checked={form.marketingOptIn}
                  onChange={(event) => updateFormField('marketingOptIn', event.target.checked)}
                />
                <span>Aceita comunicacoes de marketing</span>
              </label>
              <button type="submit" className="button button-primary" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar cliente'}
              </button>
            </form>
          </section>

          <section className="panel order-items-block">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Pedidos</p>
                <h3>Histórico de compras</h3>
              </div>
            </div>

            {customer.orders?.length ? (
              <div className="order-items-list">
                {customer.orders.map((order) => (
                  <article key={order.id} className="order-item-card">
                    <div className="product-cell">
                      <strong>Pedido #{order.id}</strong>
                      <span className="product-meta">{formatDate(order.createdAt)}</span>
                    </div>
                    <div className="order-item-metrics">
                      <span>{formatStatus(order.status)}</span>
                      <span>{order.items?.length || 0} item(ns)</span>
                      <strong>{formatCurrency(order.total)}</strong>
                    </div>
                    <Link className="button button-secondary" to={`/pedidos/${order.id}`}>
                      Ver pedido
                    </Link>
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty-copy empty-state">Este cliente ainda não possui pedidos.</p>
            )}
          </section>

          <section className="panel order-items-block">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Avisos</p>
                <h3>Produtos aguardando estoque</h3>
              </div>
            </div>

            {customer.availabilityLeads?.length ? (
              <div className="order-items-list">
                {customer.availabilityLeads.map((lead) => (
                  <article key={lead.id} className="order-item-card">
                    <div className="product-cell">
                      <strong>{lead.product?.name || `Produto #${lead.productId}`}</strong>
                      <span className="product-meta">
                        {lead.product?.category?.name || 'Sem categoria'}
                      </span>
                    </div>
                    <div className="order-item-metrics">
                      <span>Estoque</span>
                      <strong>{lead.product?.stock || 0}</strong>
                    </div>
                    <span className="product-meta">Criado em {formatDate(lead.createdAt)}</span>
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty-copy empty-state">Nenhum aviso de estoque registrado.</p>
            )}
          </section>
        </>
      ) : null}
    </AdminLayout>
  );
}

function buildCustomerForm(customer = {}) {
  return {
    name: customer.name || '',
    email: customer.email || '',
    phone: customer.phone || '',
    cpf: customer.cpf || '',
    notifyWhatsApp: Boolean(customer.notifyWhatsApp),
    preferredContact: customer.preferredContact || 'email',
    marketingOptIn: Boolean(customer.marketingOptIn),
  };
}
