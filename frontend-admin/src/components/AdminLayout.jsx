import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { isAuthenticated, clearAdminToken } from '../lib/auth';
import { brand } from '../lib/brandAssets';
import { useEffect, useState } from 'react';

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [auth, setAuth] = useState(isAuthenticated());

  useEffect(() => {
    if (!isAuthenticated()) navigate('/entrar', { replace: true });
    setAuth(isAuthenticated());
  }, [location]);

  if (!auth) return null;

  return (
    <div className="d-flex">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <svg width="32" height="32" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#333"/><path d="M10 20l5-7 4 5 7-9 7 11H10z" fill="#fff" opacity="0.9"/><circle cx="18" cy="13" r="2" fill="#fff" opacity="0.7"/></svg>
          <span>{brand.name}</span>
        </div>
        <Link to="/dashboard" className={location.pathname === '/dashboard' ? 'active' : ''}>Dashboard</Link>
        <Link to="/pedidos" className={location.pathname.startsWith('/pedidos') ? 'active' : ''}>Pedidos</Link>
        <Link to="/produtos" className={location.pathname.startsWith('/produtos') ? 'active' : ''}>Produtos</Link>
        <Link to="/categorias" className={location.pathname.startsWith('/categorias') ? 'active' : ''}>Categorias</Link>
        <Link to="/configuracoes" className={location.pathname.startsWith('/configuracoes') ? 'active' : ''}>Configurações</Link>
        <div className="sidebar-footer">
          <a href={brand.storeUrl} target="_blank" rel="noreferrer" className="btn btn-sm text-white border-secondary w-100" style={{ borderColor: '#444' }}>Ver Loja</a>
          <button className="btn btn-sm text-white-50 w-100" onClick={() => { clearAdminToken(); navigate('/entrar'); }} style={{ borderColor: '#444' }}>Sair</button>
        </div>
      </aside>
      <main className="main-content flex-grow-1">
        <Outlet />
      </main>
    </div>
  );
}
