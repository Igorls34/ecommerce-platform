import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProductById, createProduct, updateProduct, getCategories } from '../services/api';

export function ProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState({ name: '', price: '', stock: '', categoryId: '', description: '', visible: true });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getCategories().then(d => setCategories(Array.isArray(d) ? d : []));
    if (isEdit) {
      getProductById(id).then(p => setForm({ name: p.name, price: p.price, stock: p.stock, categoryId: p.categoryId, description: p.description || '', visible: p.visible })).catch(e => setError(e.message));
    }
  }, [id]);

  function handleChange(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })); }

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const data = { ...form, price: String(form.price), stock: Number(form.stock), categoryId: Number(form.categoryId) };
      if (isEdit) await updateProduct(id, data); else await createProduct(data);
      navigate('/produtos');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <div className="page-header"><h2>{isEdit ? 'Editar Produto' : 'Novo Produto'}</h2></div>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-3"><label className="form-label">Nome</label><input className="form-control" name="name" value={form.name} onChange={handleChange} required /></div>
        <div className="row g-3 mb-3">
          <div className="col-6"><label className="form-label">Preço (R$)</label><input className="form-control" name="price" type="number" step="0.01" value={form.price} onChange={handleChange} required /></div>
          <div className="col-6"><label className="form-label">Estoque</label><input className="form-control" name="stock" type="number" value={form.stock} onChange={handleChange} required /></div>
        </div>
        <div className="mb-3"><label className="form-label">Categoria</label>
          <select className="form-select" name="categoryId" value={form.categoryId} onChange={handleChange} required>
            <option value="">Selecione...</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="mb-3"><label className="form-label">Descrição</label><textarea className="form-control" name="description" value={form.description} onChange={handleChange} rows={3} /></div>
        <div className="d-flex gap-2">
          <button className="btn btn-dark" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</button>
          <button type="button" className="btn btn-outline-dark" onClick={() => navigate('/produtos')}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}
