import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { AdminLayout } from '../components/AdminLayout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useToast } from '../components/Toast';
import { formatCurrency, formatDateBR } from '../lib/formatters';
import {
  createOrderShippingLabel,
  checkoutOrderShippingLabel,
  generateOrderShippingLabel,
  printOrderShippingLabel,
  updateOrderStatus,
  getOrderById,
} from '../services/api';

const STATUS_LABELS = {
  PENDING: 'Aguardando',
  PAID: 'Pago',
  PAID_STOCK_ISSUE: 'Pago (ajuste)',
  PREPARING: 'Separando',
  PACKED: 'Embalado',
  LABEL_GENERATED: 'Etiqueta',
  POSTED: 'Postado',
  SHIPPED: 'Em trânsito',
  DELIVERED: 'Entregue',
  CANCELED: 'Cancelado',
};

const STATUS_CLASS = {
  PENDING: 'is-pending',
  PAID: 'is-paid',
  PAID_STOCK_ISSUE: 'is-pending',
  PREPARING: 'is-preparing',
  PACKED: 'is-packed',
  LABEL_GENERATED: 'is-label_generated',
  POSTED: 'is-posted',
  SHIPPED: 'is-shipped',
  DELIVERED: 'is-delivered',
  CANCELED: 'is-canceled',
};

const PAYMENT_LABELS = { pix: 'PIX', card: 'Cartão' };

const STEP_LABEL = { 0: 'Separar itens', 1: 'Gerar etiqueta', 2: 'Postar pedido', 3: 'Concluído' };
const STEP_NEXT = {
  0: 'Conferiu todos os itens? Confirme a separação.',
  1: 'Pronto para gerar a etiqueta de envio pelo Melhor Envio.',
  2: 'Preencha o código de rastreio e confirme a postagem.',
};

export function OrderDetailPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tracking, setTracking] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    let active = true;
    getOrderById(orderId)
      .then((data) => {
        if (!active) return;
        setOrder(data);
        setTracking(data.trackingCode || '');
      })
      .catch((e) => { if (active) setError(e.message || 'Erro ao carregar pedido.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [orderId]);

  async function confirmSeparation() {
    setBusy(true); setError('');
    try {
      const updated = await updateOrderStatus(orderId, { status: 'PREPARING', trackingCode: tracking });
      setOrder(updated);
      showToast('Separação confirmada!', 'success');
    } catch (e) {
      setError(e.message);
    } finally { setBusy(false); }
  }

  async function handleGenerateLabel() {
    setBusy(true); setError('');
    try {
      let cur = order;
      if (!cur.melhorEnvioOrderId) { cur = await createOrderShippingLabel(orderId, {}); setOrder((o) => ({ ...o, ...cur })); }
      if (!cur.melhorEnvioLabelUrl) {
        cur = await checkoutOrderShippingLabel(orderId); setOrder((o) => ({ ...o, ...cur }));
        cur = await generateOrderShippingLabel(orderId); setOrder((o) => ({ ...o, ...cur }));
        cur = await printOrderShippingLabel(orderId); setOrder((o) => ({ ...o, ...cur }));
      }
      if (cur.melhorEnvioLabelUrl) window.open(cur.melhorEnvioLabelUrl, '_blank', 'noopener,noreferrer');
      showToast('Etiqueta gerada!', 'success');
    } catch (e) {
      setError(e.message);
    } finally { setBusy(false); }
  }

  async function confirmPosted() {
    setBusy(true); setError('');
    try {
      const updated = await updateOrderStatus(orderId, { status: 'POSTED', trackingCode: tracking });
      setOrder(updated);
      showToast('Postagem confirmada!', 'success');
    } catch (e) {
      setError(e.message);
    } finally { setBusy(false); }
  }

  const items = order?.items || [];
  const customer = order?.customer;
  const status = order?.status || 'PENDING';
  const statusDone = ['PAID', 'PAID_STOCK_ISSUE', 'PREPARING', 'PACKED', 'LABEL_GENERATED', 'POSTED', 'SHIPPED', 'DELIVERED'].includes(status);
  const labelDone = ['LABEL_GENERATED', 'POSTED', 'SHIPPED', 'DELIVERED'].includes(status);
  const postedDone = ['POSTED', 'SHIPPED', 'DELIVERED'].includes(status);
  const isCanceled = status === 'CANCELED';
  const currentStep = postedDone ? 3 : labelDone ? 2 : statusDone ? 1 : 0;

  return (
    <AdminLayout
      title={`Pedido #${orderId}`}
      subtitle="Detalhes e processamento"
      actions={
        <Link className="button button-secondary" to="/pedidos">Voltar</Link>
      }
    >
      {loading && <LoadingSpinner variant="dual-ring" text="Carregando..." />}
      {error && <div className="feedback feedback-error">{error}</div>}

      {order && !loading && (
        <div className="order-page">
          <div className="panel" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  {customer?.name || 'Cliente'}
                </h2>
                <strong style={{ fontSize: '1.3rem', color: 'var(--accent-strong)' }}>
                  {formatCurrency(order.total)}
                </strong>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="pill" style={{ background: 'var(--bg-muted)', color: 'var(--text-soft)', fontSize: '0.78rem', padding: '4px 10px' }}>
                  {PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}
                </span>
                <span className="pill" style={{ background: 'var(--bg-muted)', color: 'var(--text-soft)', fontSize: '0.78rem', padding: '4px 10px' }}>
                  {formatDateBR(order.createdAt)}
                </span>
                {order.trackingCode && (
                  <span className="pill" style={{ background: 'var(--bg-muted)', color: 'var(--text-soft)', fontSize: '0.78rem', padding: '4px 10px', fontFamily: 'monospace' }}>
                    {order.trackingCode}
                  </span>
                )}
              </div>
            </div>
            <span className={`order-status-pill ${STATUS_CLASS[status] || ''}`}>
              {STATUS_LABELS[status] || status}
            </span>
          </div>

          {!isCanceled && currentStep < 3 && (
            <div className={`order-callout ${currentStep === 0 ? 'is-neutral' : currentStep === 1 ? 'is-warning' : 'is-success'}`}>
              <div className="order-callout-icon">{currentStep + 1}</div>
              <div className="order-callout-body">
                <strong>{STEP_LABEL[currentStep]}</strong>
                <span>{STEP_NEXT[currentStep]}</span>
              </div>
              {currentStep === 0 && (
                <button className="button button-primary" disabled={busy} onClick={confirmSeparation}>
                  {busy ? '...' : 'Confirmar'}
                </button>
              )}
              {currentStep === 1 && (
                <button className="button button-primary" disabled={busy} onClick={handleGenerateLabel}>
                  {busy ? '...' : 'Gerar etiqueta'}
                </button>
              )}
              {currentStep === 2 && (
                <div style={{ display: 'grid', gap: 8, minWidth: 200 }}>
                  <input
                    className="input"
                    placeholder="Código de rastreio"
                    value={tracking}
                    onChange={(e) => setTracking(e.target.value)}
                    style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border-soft)', fontSize: '0.84rem' }}
                  />
                  <button className="button button-primary" disabled={busy} onClick={confirmPosted}>
                    {busy ? '...' : 'Confirmar postagem'}
                  </button>
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="order-callout is-success">
              <div className="order-callout-icon">✓</div>
              <div className="order-callout-body">
                <strong>Pedido processado</strong>
                <span>Todas as etapas concluídas{order.trackingCode ? ` — Rastreio: ${order.trackingCode}` : ''}.</span>
              </div>
              {order.melhorEnvioLabelUrl && (
                <a href={order.melhorEnvioLabelUrl} target="_blank" rel="noreferrer" className="button button-secondary">Etiqueta</a>
              )}
            </div>
          )}

          {isCanceled && (
            <div className="feedback feedback-error">Este pedido foi cancelado ou o pagamento não foi aprovado.</div>
          )}

          <div className="panel form-panel">
            <div className="form-layout" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
              {customer?.email && (
                <div style={{ display: 'grid', gap: 3, padding: '10px 12px', background: 'var(--bg-muted)', borderRadius: 12 }}>
                  <span style={{ color: 'var(--text-faint)', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Email</span>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>{customer.email}</strong>
                </div>
              )}
              {customer?.phone && (
                <div style={{ display: 'grid', gap: 3, padding: '10px 12px', background: 'var(--bg-muted)', borderRadius: 12 }}>
                  <span style={{ color: 'var(--text-faint)', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Telefone</span>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>{customer.phone}</strong>
                </div>
              )}
              {customer?.cpf && (
                <div style={{ display: 'grid', gap: 3, padding: '10px 12px', background: 'var(--bg-muted)', borderRadius: 12 }}>
                  <span style={{ color: 'var(--text-faint)', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>CPF</span>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>{customer.cpf}</strong>
                </div>
              )}
              {order.gatewayProvider && (
                <div style={{ display: 'grid', gap: 3, padding: '10px 12px', background: 'var(--bg-muted)', borderRadius: 12 }}>
                  <span style={{ color: 'var(--text-faint)', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pagamento</span>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>{order.gatewayProvider === 'local' ? 'PIX Local' : order.gatewayProvider}</strong>
                </div>
              )}
              {order.paidAt && (
                <div style={{ display: 'grid', gap: 3, padding: '10px 12px', borderRadius: 12, background: 'var(--success-soft)' }}>
                  <span style={{ color: 'var(--text-faint)', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pago em</span>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--success-text)' }}>{formatDateBR(order.paidAt)}</strong>
                </div>
              )}
              {order.paymentExpiresAt && status === 'PENDING' && (
                <div style={{ display: 'grid', gap: 3, padding: '10px 12px', borderRadius: 12, background: '#fff3cd' }}>
                  <span style={{ color: 'var(--text-faint)', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Expira em</span>
                  <strong style={{ fontSize: '0.88rem', color: '#856404' }}>{formatDateBR(order.paymentExpiresAt)}</strong>
                </div>
              )}
            </div>
          </div>

          {order.orderNotes && (
            <div className="panel" style={{ padding: '14px 20px', display: 'flex', alignItems: 'flex-start', gap: 12, borderLeft: '3px solid var(--accent-strong)' }}>
              <span style={{ color: 'var(--text-faint)', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap', paddingTop: 2 }}>Obs</span>
              <span style={{ color: 'var(--text-main)', fontSize: '0.88rem', lineHeight: 1.5 }}>{order.orderNotes}</span>
            </div>
          )}

          <div className="panel table-panel">
            <div className="section-heading">
              <p className="eyebrow">Itens do pedido</p>
              <h3>{items.length} {items.length === 1 ? 'produto' : 'produtos'}</h3>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th style={{ width: 80, textAlign: 'center' }}>Qtd</th>
                  <th style={{ width: 120, textAlign: 'right' }}>Unitário</th>
                  <th style={{ width: 120, textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {item.product?.imageUrl ? (
                          <img src={item.product.imageUrl} alt="" style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--border-soft)', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--bg-muted)', border: '1px solid var(--border-soft)', display: 'grid', placeItems: 'center', flexShrink: 0, color: 'var(--text-faint)', fontSize: '0.7rem', fontWeight: 700 }}>?</div>
                        )}
                        <div style={{ minWidth: 0 }}>
                          <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)', display: 'block', overflowWrap: 'anywhere' }}>
                            {item.product?.name || `Produto #${item.productId}`}
                          </strong>
                          {item.variant?.name && (
                            <small style={{ color: 'var(--text-soft)', fontSize: '0.8rem' }}>{item.variant.name}</small>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.95rem' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '0.9rem' }}>{formatCurrency(item.price)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.95rem' }}>{formatCurrency(item.price * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
