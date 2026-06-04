import { Link } from 'react-router-dom';
import { useCart } from '../state/CartContext';
import { formatCurrency } from '../lib/formatters';

export function CartPage() {
  const { items, removeItem, updateQuantity } = useCart();
  const total = items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="container py-5 text-center">
        <h3>Seu carrinho está vazio</h3>
        <p className="text-muted">Adicione produtos para continuar.</p>
        <Link className="btn btn-primary" to="/produtos">Ver Produtos</Link>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <h2 className="mb-4">Carrinho</h2>
      <div className="row g-4">
        <div className="col-lg-8">
          {items.map(item => (
            <div key={`${item.productId}-${item.variantId || ''}`} className="card mb-3">
              <div className="card-body">
                <div className="row align-items-center">
                  <div className="col-2 col-md-1">
                    {item.imageUrl && <img src={item.imageUrl} className="img-fluid rounded" alt={item.name} />}
                  </div>
                  <div className="col-5 col-md-5">
                    <h6 className="mb-0">{item.name}</h6>
                    {item.variantName && <small className="text-muted">{item.variantName}</small>}
                  </div>
                  <div className="col-3 col-md-2">
                    <input type="number" className="form-control form-control-sm" min="1" max={item.stock || 99}
                      value={item.quantity}
                      onChange={e => updateQuantity(item.productId, parseInt(e.target.value) || 1, item.stock, item.variantId)} />
                  </div>
                  <div className="col-2 col-md-2 text-end">
                    <strong>{formatCurrency(Number(item.price) * item.quantity)}</strong>
                  </div>
                  <div className="col-12 col-md-2 text-end mt-2 mt-md-0">
                    <button className="btn btn-outline-danger btn-sm" onClick={() => removeItem(item.productId, item.variantId)}>
                      Remover
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="col-lg-4">
          <div className="card checkout-summary">
            <div className="card-body">
              <h5 className="card-title">Resumo</h5>
              <hr />
              <div className="d-flex justify-content-between mb-2">
                <span>Subtotal</span>
                <strong>{formatCurrency(total)}</strong>
              </div>
              <div className="d-flex justify-content-between mb-3">
                <span>Frete</span>
                <span className="text-muted">Calculado no checkout</span>
              </div>
              <hr />
              <div className="d-flex justify-content-between mb-3">
                <span>Total</span>
                <strong className="text-primary fs-5">{formatCurrency(total)}</strong>
              </div>
              <Link className="btn btn-primary w-100" to="/checkout">Finalizar Compra</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
