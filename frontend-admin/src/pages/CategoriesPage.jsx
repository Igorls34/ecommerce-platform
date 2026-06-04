import { useState, useEffect } from 'react';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../services/api';

export function CategoriesPage() {
  const [cats, setCats] = useState([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function load() {
    getCategories().then(d => setCats(Array.isArray(d) ? d : [])).catch(e => setError(e.message)).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!name.trim()) return;
    try { await createCategory({ name: name.trim(), visible: true }); setName(''); load(); } catch (e) { setError(e.message); }
  }

  async function toggleVisibility(cat) {
    try { await updateCategory(cat.id, { visible: !cat.visible }); load(); } catch (e) { setError(e.message); }
  }

  async function handleDelete(id) {
    if (!confirm('Excluir esta categoria?')) return;
    try { await deleteCategory(id); load(); } catch (e) { setError(e.message); }
  }

  return (
    <div>
      <div className="page-header"><h2>Categorias</h2></div>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleAdd} className="d-flex gap-2 mb-3">
        <input className="form-control" placeholder="Nova categoria" value={name} onChange={e => setName(e.target.value)} />
        <button className="btn btn-dark" type="submit">Adicionar</button>
      </form>
      {loading ? <div className="text-center py-4"><div className="spinner-border" /></div> :
        <div className="card"><table className="table mb-0">
          <thead><tr><th>Nome</th><th>Status</th><th style={{width:120}}></th></tr></thead>
          <tbody>
            {cats.map(c => (
              <tr key={c.id}>
                <td><strong>{c.name}</strong></td>
                <td><span className={`badge ${c.visible ? 'bg-success' : 'bg-secondary'}`}>{c.visible ? 'Visível' : 'Oculta'}</span></td>
                <td>
                  <div className="d-flex gap-2">
                    <button className="btn btn-outline-dark btn-sm" onClick={() => toggleVisibility(c)}>{c.visible ? 'Ocultar' : 'Mostrar'}</button>
                    <button className="btn btn-outline-danger btn-sm" onClick={() => handleDelete(c.id)}>Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      }
    </div>
  );
}
