import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../state/CartContext';
import { useStoreAuth } from '../state/StoreAuthContext';
import { createStoreOrder } from '../services/api';
import { formatCurrency } from '../lib/formatters';

export function CheckoutPage() {
  const navigate = useNavigate();
  const { items, clear } = useCart();
  const { isAuthenticated, token, isLoadingAuth } = useStoreAuth();
  const [form, setForm] = useState({ name: '', email: '', phone: '', cpf: '', zipCode: '', street: '', number: '', neighborhood: '', city: '', state: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const total = items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
  const pixTotal = total * 0.95;

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isAuthenticated || !token) { setError('Faça login para finalizar.'); return; }
    setLoading(true); setError('');
    try {
      const response = await createStoreOrder(token, {
        items: items.map(i => ({ productId: i.productId, variantId: i.variantId || null, quantity: i.quantity })),
        name: form.name, email: form.email, phone: form.phone, cpf: form.cpf,
        zipCode: form.zipCode, street: form.street, number: form.number,
        neighborhood: form.neighborhood, city: form.city, state: form.state,
        paymentMethod: 'pix', orderNotes: form.notes,
        giftWrap: false, notifyWhatsApp: false, preferredContact: 'email',
        checkoutAttemptId: crypto.randomUUID?.() || Date.now().toString(),
      });
      window.sessionStorage.setItem(`payment:${response.order.id}`, JSON.stringify(response.payment));
      clear();
      navigate(`/checkout/pagamento/${response.order.id}`, { state: { order: response.order, payment: response.payment } });
    } catch (err) {
      setError(err.message || 'Erro ao criar pedido.');
    } finally { setLoading(false); }
  }

  if (items.length === 0) {
    return <div className="container py-5 text-center"><h3>Carrinho vazio</h3><p>Adicione produtos antes de finalizar.</p></div>;
  }

  if (isLoadingAuth) {
    return <div className="container py-5 text-center"><div className="spinner-border" /><p className="mt-3 text-muted">Verificando sessão...</p></div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="container py-5" style={{ maxWidth: 480 }}>
        <div className="text-center mb-4">
          <div style={{ width: 64, height: 64, borderRadius: 20, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '1.5rem' }}>🔒</div>
          <h3>Faça login para continuar</h3>
          <p className="text-muted">Você precisa estar logado para finalizar a compra.</p>
        </div>
        <Link to="/conta" state={{ from: '/checkout' }} className="btn btn-dark w-100 mb-2" style={{ padding: '14px', borderRadius: 12 }}>Entrar ou Criar Conta</Link>
        <Link to="/produtos" className="btn btn-outline-dark w-100" style={{ borderRadius: 12 }}>Continuar Comprando</Link>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <h2 className="mb-4">Checkout</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="row g-4">
        <div className="col-lg-7">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title mb-3">Seus Dados</h5>
              <form onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-md-6"><label className="form-label">Nome</label><input className="form-control" name="name" value={form.name} onChange={handleChange} required /></div>
                  <div className="col-md-6"><label className="form-label">Email</label><input className="form-control" type="email" name="email" value={form.email} onChange={handleChange} required /></div>
                  <div className="col-md-6"><label className="form-label">Telefone</label><input className="form-control" name="phone" value={form.phone} onChange={handleChange} required /></div>
                  <div className="col-md-6"><label className="form-label">CPF</label><input className="form-control" name="cpf" value={form.cpf} onChange={handleChange} required /></div>
                </div>
                <h6 className="mt-4 mb-3">Endereço de Entrega</h6>
                <div className="row g-3">
                  <div className="col-md-4"><label className="form-label">CEP</label><input className="form-control" name="zipCode" value={form.zipCode} onChange={handleChange} required /></div>
                  <div className="col-md-6"><label className="form-label">Rua</label><input className="form-control" name="street" value={form.street} onChange={handleChange} required /></div>
                  <div className="col-md-2"><label className="form-label">Nº</label><input className="form-control" name="number" value={form.number} onChange={handleChange} required /></div>
                  <div className="col-md-4"><label className="form-label">Bairro</label><input className="form-control" name="neighborhood" value={form.neighborhood} onChange={handleChange} required /></div>
                  <div className="col-md-6"><label className="form-label">Cidade</label><input className="form-control" name="city" value={form.city} onChange={handleChange} required /></div>
                  <div className="col-md-2"><label className="form-label">UF</label><input className="form-control" name="state" value={form.state} onChange={handleChange} maxLength={2} required /></div>
                </div>
                <div className="mt-3"><label className="form-label">Observações</label><textarea className="form-control" name="notes" value={form.notes} onChange={handleChange} rows={2} /></div>
                <button type="submit" className="btn btn-primary btn-lg w-100 mt-4" disabled={loading}>
                  {loading ? 'Criando pedido...' : `Pagar via PIX — ${formatCurrency(pixTotal)} (5% desc)`}
                </button>
              </form>
            </div>
          </div>
        </div>
        <div className="col-lg-5">
          <div className="card checkout-summary">
            <div className="card-body">
              <h5 className="card-title">Resumo do Pedido</h5>
              <hr />
              {items.map(item => (
                <div key={`${item.productId}-${item.variantId || ''}`} className="d-flex justify-content-between mb-2">
                  <span className="small">{item.quantity}x {item.name}</span>
                  <strong className="small">{formatCurrency(Number(item.price) * item.quantity)}</strong>
                </div>
              ))}
              <hr />
              <div className="d-flex justify-content-between"><span>Subtotal</span><strong>{formatCurrency(total)}</strong></div>
              <div className="d-flex justify-content-between text-success"><span>Desconto PIX (5%)</span><strong>-{formatCurrency(total * 0.05)}</strong></div>
              <hr />
              <div className="d-flex justify-content-between"><span>Total</span><strong className="text-primary fs-5">{formatCurrency(pixTotal)}</strong></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
