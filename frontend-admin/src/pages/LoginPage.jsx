import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { isAuthenticated, setAdminToken } from '../lib/auth';
import { brandAssets, brand } from '../lib/brandAssets';
import { loginAdmin } from '../services/api';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(
    () =>
      location.state?.message ||
      window.sessionStorage.getItem('adminAuthMessage') ||
      '',
  );
  const redirectTo =
    location.state?.from || window.sessionStorage.getItem('adminAuthRedirectTo') || '/dashboard';

  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      const data = await loginAdmin({ email: email.trim(), password });
      setAdminToken(data.token);
      window.sessionStorage.removeItem('adminAuthMessage');
      window.sessionStorage.removeItem('adminAuthRedirectTo');
      navigate(redirectTo === '/' ? '/dashboard' : redirectTo, { replace: true });
    } catch (requestError) {
      setError(requestError.message || 'Erro ao fazer login.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page auth-page-modern">
      <section className="auth-card-modern" aria-label="Login administrativo">
        <form className="auth-login-form-modern" onSubmit={handleSubmit}>
          <div className="auth-form-heading">
            <img
              src={brandAssets.symbolBlue}
              alt={brand.name}
              className="auth-logo-mark auth-logo-brand"
              decoding="async"
            />
            <div>
              <h1>Entrar</h1>
              <span>Painel administrativo {brand.name}</span>
            </div>
          </div>

          <div className="field auth-field">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="admin@gmail.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="field auth-field">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Sua senha"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <a
              href={`https://wa.me/${brand.phone.store}?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20o%20painel%20administrativo.`}
              target="_blank"
              rel="noopener noreferrer"
              className="auth-forgot-password"
            >
              Esqueci minha senha
            </a>
          </div>

          {error ? <p className="form-error">{error}</p> : null}

          <button type="submit" className="button button-primary auth-submit" disabled={busy}>
            {busy ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  );
}
