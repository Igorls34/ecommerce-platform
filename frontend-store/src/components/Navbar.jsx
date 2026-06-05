import { Link } from 'react-router-dom';
import { brand } from '../lib/brandAssets';
import { useCart } from '../state/CartContext';

export function Navbar() {
  const { totalItems } = useCart();

  return (
    <nav className="navbar navbar-expand-lg sticky-top" style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
      <div className="container">
        <Link className="navbar-brand fw-bold" to="/" style={{ color: '#111', fontSize: '1.25rem', letterSpacing: '-0.02em' }}>
          {brand.name}
        </Link>

        <div className="d-flex gap-2 align-items-center d-lg-none">
          <Link to="/conta" style={{ color: '#666', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 500 }}>Conta</Link>
          <Link to="/carrinho" className="position-relative" style={{ color: '#111', textDecoration: 'none' }}>
            🛒
            {totalItems > 0 && (
              <span className="cart-badge position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                {totalItems}
              </span>
            )}
          </Link>
          <button className="navbar-toggler border-0 p-0" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav"
            style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="collapse navbar-collapse" id="mainNav">
          <ul className="navbar-nav mx-auto gap-1">
            <li className="nav-item"><Link className="nav-link" to="/" style={{ color: '#111', fontWeight: 500, fontSize: '0.9rem' }}>Início</Link></li>
            <li className="nav-item"><Link className="nav-link" to="/produtos" style={{ color: '#111', fontWeight: 500, fontSize: '0.9rem' }}>Produtos</Link></li>
            <li className="nav-item"><Link className="nav-link" to="/carrinho" style={{ color: '#111', fontWeight: 500, fontSize: '0.9rem' }}>Carrinho</Link></li>
          </ul>
          <div className="d-none d-lg-flex gap-2 align-items-center">
            <Link to="/conta" className="btn btn-outline-dark btn-sm" style={{ borderRadius: 10, fontWeight: 500 }}>Conta</Link>
            <Link to="/carrinho" className="btn btn-dark btn-sm position-relative" style={{ borderRadius: 10 }}>
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
