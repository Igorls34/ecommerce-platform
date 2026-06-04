import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProducts, deleteProduct } from '../services/api';
import { formatCurrency } from '../lib/formatters';

export function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    getProducts().then(d => setProducts(Array.isArray(d) ? d : d.data || [])).catch(e => setError(e.message)).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id) {
    if (!confirm('Excluir este produto?')) return;
    try { await deleteProduct(id); load(); } catch (e) { setError(e.message); }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Produtos</h2>
        <Link className="btn btn-dark" to="/produtos/novo">+ Novo</Link>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {loading ? <div className="text-center py-4"><div className="spinner-border" /></div> :
        <div className="card">
          <table className="table mb-0">
            <thead><tr><th>Produto</th><th>Categoria</th><th>Preço</th><th>Estoque</th><th style={{width:120}}></th></tr></thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td>
                    <div className="d-flex align-items-center gap-3">
                      {p.imageUrl ? <img src={p.imageUrl} className="thumb" alt="" /> : <div className="thumb d-flex align-items-center justify-content-center text-muted small">?</div>}
                      <strong>{p.name}</strong>
                    </div>
                  </td>
                  <td>{p.category?.name || '-'}</td>
                  <td>{formatCurrency(p.price)}</td>
                  <td><span className={`badge ${p.stock > 0 ? 'bg-success' : 'bg-danger'}`}>{p.stock}</span></td>
                  <td>
                    <div className="d-flex gap-2">
                      <Link className="btn btn-outline-dark btn-sm" to={`/produtos/${p.id}`}>Editar</Link>
                      <button className="btn btn-outline-danger btn-sm" onClick={() => handleDelete(p.id)}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
    </div>
  );
}
