import { useState, useEffect } from 'react';
import { getAdminSettings, updateAdminSettings } from '../services/api';

export function SettingsPage() {
  const [form, setForm] = useState({ storeName: '', adminEmail: '', pixKey: '', storeUrl: '' });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getAdminSettings().then(d => setForm({
      storeName: d?.storeName || '', adminEmail: d?.adminOrderEmail || '',
      pixKey: d?.pixKey || '', storeUrl: d?.storeBaseUrl || ''
    })).catch(() => {});
  }, []);

  function handleChange(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })); }

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try { await updateAdminSettings(form); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    catch (err) { alert(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <div className="page-header"><h2>Configurações</h2></div>
      {saved && <div className="alert alert-success">Salvo com sucesso!</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-3"><label className="form-label">Nome da Loja</label><input className="form-control" name="storeName" value={form.storeName} onChange={handleChange} /></div>
        <div className="mb-3"><label className="form-label">E-mail Admin</label><input className="form-control" name="adminEmail" value={form.adminEmail} onChange={handleChange} /></div>
        <div className="mb-3"><label className="form-label">Chave PIX</label><input className="form-control" name="pixKey" value={form.pixKey} onChange={handleChange} /></div>
        <div className="mb-3"><label className="form-label">URL da Loja</label><input className="form-control" name="storeUrl" value={form.storeUrl} onChange={handleChange} /></div>
        <button className="btn btn-dark" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</button>
      </form>
    </div>
  );
}
