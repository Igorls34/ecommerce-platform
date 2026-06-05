import { Link } from 'react-router-dom';
import { useCart } from '../state/CartContext';
import { formatCurrency } from '../lib/formatters';

export function CartPage() {
  const { items, removeItem, updateQuantity } = useCart();
  const total = items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="container py-5">
        <div className="empty-state animate-in">
          <div className="icon">🛒</div>
          <h3>Seu carrinho está vazio</h3>
          <p>Explore nossos produtos e adicione itens ao carrinho para continuar.</p>
          <Link className="btn btn-dark" to="/produtos" style={{ borderRadius: 12, padding: '12px 28px' }}>
            Ver Produtos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <h2 className="mb-1" style={{ fontWeight: 700 }}>Carrinho</h2>
      <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>{items.length} {items.length === 1 ? 'item' : 'itens'}</p>
      <div className="row g-4">
        <div className="col-lg-8">
          {items.map((item, i) => (
            <div key={`${item.productId}-${item.variantId || ''}`} className="card mb-3 animate-in" style={{ animationDelay: `${i * 0.06}s`, borderRadius: 14 }}>
              <div className="card-body">
                <div className="row align-items-center g-3">
                  <div className="col-2 col-md-1">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} className="img-fluid rounded-3" alt={item.name} style={{ width: 56, height: 56, objectFit: 'cover' }} />
                    ) : (
                      <div className="rounded-3 d-flex align-items-center justify-content-center" style={{ width: 56, height: 56, background: '#f5f5f5', fontSize: '1.2rem' }}>📦</div>
                    )}
                  </div>
                  <div className="col-5 col-md-5">
                    <h6 className="mb-0" style={{ fontWeight: 600, fontSize: '0.92rem' }}>{item.name}</h6>
                    {item.variantName && <small className="text-muted">{item.variantName}</small>}
                  </div>
                  <div className="col-3 col-md-2">
                    <div className="d-flex align-items-center gap-1" style={{ background: '#f5f5f5', borderRadius: 10, padding: '2px' }}>
                      <button className="btn btn-sm border-0" style={{ minWidth: 32, fontWeight: 600, fontSize: '0.9rem' }}
                        onClick={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1), item.stock, item.variantId)}>−</button>
                      <span style={{ minWidth: 28, textAlign: 'center', fontWeight: 600, fontSize: '0.88rem' }}>{item.quantity}</span>
                      <button className="btn btn-sm border-0" style={{ minWidth: 32, fontWeight: 600, fontSize: '0.9rem' }}
                        onClick={() => updateQuantity(item.productId, item.quantity + 1, item.stock, item.variantId)}>+</button>
                    </div>
                  </div>
                  <div className="col-2 col-md-2 text-end">
                    <strong style={{ fontSize: '0.95rem' }}>{formatCurrency(Number(item.price) * item.quantity)}</strong>
                  </div>
                  <div className="col-12 col-md-2 text-end mt-2 mt-md-0">
                    <button className="btn btn-sm" onClick={() => removeItem(item.productId, item.variantId)}
                      style={{ color: '#dc2626', fontSize: '0.8rem', fontWeight: 500, padding: '4px 8px' }}>
                      Remover
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="col-lg-4">
          <div className="card checkout-summary" style={{ borderRadius: 16 }}>
            <div className="card-body" style={{ padding: 20 }}>
              <h5 className="card-title mb-3" style={{ fontWeight: 700, fontSize: '1rem' }}>Resumo do Pedido</h5>
              <div className="d-flex justify-content-between mb-2" style={{ fontSize: '0.9rem' }}>
                <span className="text-muted">Subtotal</span>
                <strong>{formatCurrency(total)}</strong>
              </div>
              <div className="d-flex justify-content-between mb-2" style={{ fontSize: '0.9rem' }}>
                <span className="text-muted">Desconto PIX (5%)</span>
                <span style={{ color: '#059669' }}>−{formatCurrency(total * 0.05)}</span>
              </div>
              <hr />
              <div className="d-flex justify-content-between mb-3">
                <span style={{ fontWeight: 600 }}>Total</span>
                <strong style={{ fontSize: '1.2rem', color: '#111' }}>{formatCurrency(total * 0.95)}</strong>
              </div>
              <Link className="btn btn-dark w-100" to="/checkout" style={{ padding: '14px', borderRadius: 12, fontWeight: 600 }}>
                Finalizar Compra
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
