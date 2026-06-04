import { useState } from 'react';
import { useStoreAuth } from '../state/StoreAuthContext';
import { loginStoreCustomer, registerStoreCustomer } from '../services/api';

export function AccountPage() {
  const { isAuthenticated, customer, login, logout, token } = useStoreAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })); }

  async function handleLogin(e) {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const data = await loginStoreCustomer({ email: form.email, password: form.password });
      login(data.token, data.customer);
    } catch (err) { setError(err.message || 'Erro ao entrar.'); }
    finally { setLoading(false); }
  }

  async function handleRegister(e) {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const data = await registerStoreCustomer({ name: form.name, email: form.email, phone: form.phone, password: form.password });
      login(data.token, data.customer);
    } catch (err) { setError(err.message || 'Erro ao cadastrar.'); }
    finally { setLoading(false); }
  }

  if (isAuthenticated && customer) {
    return (
      <div className="container py-4" style={{ maxWidth: 500 }}>
        <div className="card">
          <div className="card-body text-center">
            <h4>Olá, {customer.name}!</h4>
            <p className="text-muted">{customer.email}</p>
            <button className="btn btn-outline-danger" onClick={logout}>Sair</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4" style={{ maxWidth: 450 }}>
      <ul className="nav nav-pills mb-4 justify-content-center">
        <li className="nav-item"><button className={`nav-link ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>Entrar</button></li>
        <li className="nav-item"><button className={`nav-link ${mode === 'register' ? 'active' : ''}`} onClick={() => setMode('register')}>Criar Conta</button></li>
      </ul>

      {error && <div className="alert alert-danger">{error}</div>}

      {mode === 'login' ? (
        <form onSubmit={handleLogin}>
          <div className="mb-3"><label className="form-label">Email</label><input className="form-control" name="email" type="email" value={form.email} onChange={handleChange} required /></div>
          <div className="mb-3"><label className="form-label">Senha</label><input className="form-control" name="password" type="password" value={form.password} onChange={handleChange} required /></div>
          <button className="btn btn-primary w-100" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
        </form>
      ) : (
        <form onSubmit={handleRegister}>
          <div className="mb-3"><label className="form-label">Nome</label><input className="form-control" name="name" value={form.name} onChange={handleChange} required /></div>
          <div className="mb-3"><label className="form-label">Email</label><input className="form-control" name="email" type="email" value={form.email} onChange={handleChange} required /></div>
          <div className="mb-3"><label className="form-label">Telefone</label><input className="form-control" name="phone" value={form.phone} onChange={handleChange} required /></div>
          <div className="mb-3"><label className="form-label">Senha</label><input className="form-control" name="password" type="password" value={form.password} onChange={handleChange} required /></div>
          <button className="btn btn-primary w-100" disabled={loading}>{loading ? 'Cadastrando...' : 'Criar Conta'}</button>
        </form>
      )}
    </div>
  );
}
