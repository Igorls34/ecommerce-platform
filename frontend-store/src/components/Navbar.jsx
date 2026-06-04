import { Link } from 'react-router-dom';
import { brand } from '../lib/brandAssets';
import { useCart } from '../state/CartContext';

export function Navbar() {
  const { totalItems } = useCart();

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-white sticky-top">
      <div className="container">
        <Link className="navbar-brand" to="/" style={{ color: 'var(--bs-primary)' }}>
          {brand.name}
        </Link>
        <button className="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav">
          <span className="navbar-toggler-icon" style={{ filter: 'invert(0.2)' }} />
        </button>
        <div className="collapse navbar-collapse" id="mainNav">
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <Link className="nav-link text-dark" to="/">Início</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link text-dark" to="/produtos">Produtos</Link>
            </li>
          </ul>
          <div className="d-flex gap-2 align-items-center">
            <Link className="btn btn-outline-primary btn-sm" to="/conta">Conta</Link>
            <Link className="btn btn-primary btn-sm position-relative" to="/carrinho">
              🛒 Carrinho
              {totalItems > 0 && (
                <span className="cart-badge position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                  {totalItems}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
