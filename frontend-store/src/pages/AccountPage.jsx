import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useStoreAuth } from '../state/StoreAuthContext';
import { loginStoreCustomer, registerStoreCustomer } from '../services/api';
import { brand } from '../lib/brandAssets';

export function AccountPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, customer, login, logout } = useStoreAuth();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', password2: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && customer) {
      const to = location.state?.from || '/conta';
      if (to !== '/conta') navigate(to, { replace: true });
    }
  }, [isAuthenticated]);

  function handleChange(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })); }

  async function handleLogin(e) {
    e.preventDefault(); setLoading(true); setError('');
    try { const d = await loginStoreCustomer({ email: form.email, password: form.password }); login(d.token, d.customer); }
    catch (err) { setError(err.message || 'Email ou senha inválidos.'); }
    finally { setLoading(false); }
  }

  async function handleRegister(e) {
    e.preventDefault(); setLoading(true); setError('');
    if (form.password !== form.password2) { setError('As senhas não conferem.'); setLoading(false); return; }
    try { const d = await registerStoreCustomer({ name: form.name, email: form.email, phone: form.phone, password: form.password }); login(d.token, d.customer); }
    catch (err) { setError(err.message || 'Erro ao criar conta.'); }
    finally { setLoading(false); }
  }

  const inputStyle = {
    width: '100%', padding: '12px 14px', border: '1px solid #e5e5e5', borderRadius: 10,
    fontSize: '0.9rem', outline: 'none', background: '#fff'
  };

  if (isAuthenticated && customer) {
    return (
      <div className="container py-5" style={{ maxWidth: 440 }}>
        <div className="text-center">
          <div style={{ width: 72, height: 72, borderRadius: 24, background: '#111', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '1.8rem', fontWeight: 700 }}>
            {customer.name.charAt(0)}
          </div>
          <h3 style={{ fontWeight: 700 }}>Olá, {customer.name}</h3>
          <p className="text-muted">{customer.email}</p>
          {customer.phone && <p className="text-muted small">{customer.phone}</p>}
          <div className="d-flex gap-2 justify-content-center mt-4">
            <Link to="/produtos" className="btn btn-dark" style={{ borderRadius: 10 }}>Ver Produtos</Link>
            <button className="btn btn-outline-dark" style={{ borderRadius: 10 }} onClick={logout}>Sair</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <div className="text-center mb-5">
        <h2 style={{ fontWeight: 700, color: '#111' }}>Minha Conta</h2>
        <p className="text-muted">Entre ou crie sua conta para finalizar compras</p>
      </div>

      {error && <div className="alert alert-danger mx-auto" style={{ maxWidth: 700 }}>{error}</div>}

      <div className="row g-4 justify-content-center">
        <div className="col-md-5">
          <div style={{ background: '#fff', borderRadius: 20, padding: 32, border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 24, color: '#111' }}>Entrar</h3>
            <form onSubmit={handleLogin}>
              <div className="mb-3"><label className="form-label">Email</label><input name="email" type="email" value={form.email} onChange={handleChange} style={inputStyle} placeholder="seu@email.com" required /></div>
              <div className="mb-3"><label className="form-label">Senha</label><input name="password" type="password" value={form.password} onChange={handleChange} style={inputStyle} placeholder="Sua senha" required /></div>
              <button className="btn btn-dark w-100 py-3" style={{ borderRadius: 12, fontWeight: 600 }} disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
            </form>
          </div>
        </div>

        <div className="col-md-5">
          <div style={{ background: '#f9f9f9', borderRadius: 20, padding: 32, border: '1px solid rgba(0,0,0,0.06)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 24, color: '#111' }}>Criar Conta</h3>
            <form onSubmit={handleRegister}>
              <div className="mb-3"><label className="form-label">Nome</label><input name="name" value={form.name} onChange={handleChange} style={inputStyle} placeholder="Seu nome completo" required /></div>
              <div className="mb-3"><label className="form-label">Email</label><input name="email" type="email" value={form.email} onChange={handleChange} style={inputStyle} placeholder="seu@email.com" required /></div>
              <div className="mb-3"><label className="form-label">Telefone</label><input name="phone" value={form.phone} onChange={handleChange} style={inputStyle} placeholder="(11) 99999-9999" required /></div>
              <div className="row g-2 mb-3">
                <div className="col-6"><label className="form-label">Senha</label><input name="password" type="password" value={form.password} onChange={handleChange} style={inputStyle} required /></div>
                <div className="col-6"><label className="form-label">Confirmar</label><input name="password2" type="password" value={form.password2} onChange={handleChange} style={inputStyle} required /></div>
              </div>
              <button className="btn btn-dark w-100 py-3" style={{ borderRadius: 12, fontWeight: 600 }} disabled={loading}>{loading ? 'Criando...' : 'Criar Conta'}</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
