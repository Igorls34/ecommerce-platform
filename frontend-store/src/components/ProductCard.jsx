import { Link } from 'react-router-dom';
import { formatCurrency } from '../lib/formatters';

export function ProductCard({ product }) {
  return (
    <Link to={`/produto/${product.id}`} className="text-decoration-none">
      <div className="card product-card h-100">
        {product.imageUrl ? (
          <img src={product.imageUrl} className="card-img-top" alt={product.name} loading="lazy" />
        ) : (
          <div className="card-img-top bg-light d-flex align-items-center justify-content-center text-muted">
            Sem imagem
          </div>
        )}
        <div className="card-body d-flex flex-column">
          <h5 className="card-title">{product.name}</h5>
          <p className="card-text text-muted small flex-grow-1">
            {product.category?.name || ''}
          </p>
          <div className="d-flex justify-content-between align-items-center mt-2">
            <span className="price">{formatCurrency(product.price)}</span>
            {product.stock > 0 ? (
              <span className="badge bg-success">Disponível</span>
            ) : (
              <span className="badge bg-secondary">Indisponível</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
