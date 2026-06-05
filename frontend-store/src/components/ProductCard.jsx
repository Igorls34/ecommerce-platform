import { Link } from 'react-router-dom';
import { formatCurrency } from '../lib/formatters';

const CATEGORY_ICONS = {
  'Eletrônicos': '📱',
  'Roupas': '👕',
  'Casa & Decoração': '🏠',
  'Esportes': '⚽',
};

export function ProductCard({ product }) {
  const icon = CATEGORY_ICONS[product.category?.name] || '📦';

  return (
    <Link to={`/produto/${product.id}`} className="text-decoration-none">
      <div className="product-card">
        {product.imageUrl ? (
          <img src={product.imageUrl} className="card-img-top" alt={product.name} loading="lazy" />
        ) : (
          <div className="product-img-placeholder">
            <span>{icon}</span>
          </div>
        )}
        <div className="card-body d-flex flex-column" style={{ padding: 14 }}>
          <p className="text-muted mb-1" style={{ fontSize: '0.72rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {product.category?.name || 'Produto'}
          </p>
          <h5 className="card-title mb-2">{product.name}</h5>
          <div className="d-flex justify-content-between align-items-center mt-auto">
            <span className="price">{formatCurrency(product.price)}</span>
            {product.stock > 0 ? (
              <span className="badge" style={{ background: '#ecfdf5', color: '#065f46', fontWeight: 500 }}>
                {product.stock} un.
              </span>
            ) : (
              <span className="badge" style={{ background: '#fef2f2', color: '#991b1b', fontWeight: 500 }}>
                Esgotado
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
