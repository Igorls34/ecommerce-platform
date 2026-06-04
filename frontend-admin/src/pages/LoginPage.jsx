import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { isAuthenticated, setAdminToken } from '../lib/auth';
import { brand } from '../lib/brandAssets';
import { loginAdmin } from '../services/api';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated()) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try { const d = await loginAdmin({ email: email.trim(), password }); setAdminToken(d.token); navigate('/dashboard', { replace: true }); }
    catch (err) { setError(err.message || 'Erro ao fazer login.'); }
    finally { setBusy(false); }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <svg width="26" height="26" viewBox="0 0 40 40"><path d="M10 20l5-7 4 5 7-9 7 11H10z" fill="#fff" opacity="0.9"/><circle cx="18" cy="13" r="2" fill="#fff" opacity="0.7"/></svg>
          </div>
          <h1>{brand.name}</h1>
          <p style={{ color: '#999', fontSize: '0.85rem', margin: 0 }}>Painel Administrativo</p>
        </div>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-3"><label className="form-label">E-mail</label><input className="form-control" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@exemplo.com" required /></div>
          <div className="mb-3"><label className="form-label">Senha</label><input className="form-control" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Sua senha" required /></div>
          <button className="btn btn-dark w-100" disabled={busy}>{busy ? 'Entrando...' : 'Entrar'}</button>
        </form>
      </div>
    </div>
  );
}
