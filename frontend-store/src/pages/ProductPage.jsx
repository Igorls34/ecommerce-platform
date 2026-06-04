import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getStoreProductById } from '../services/api';
import { formatCurrency } from '../lib/formatters';
import { useCart } from '../state/CartContext';

export function ProductPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();

  useEffect(() => {
    getStoreProductById(id).then(setProduct).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  function handleAdd() {
    addItem({ productId: product.id, name: product.name, price: product.price, imageUrl: product.imageUrl, stock: product.stock });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  if (loading) return <div className="container py-5 text-center"><div className="spinner-border" /></div>;
  if (!product) return <div className="container py-5"><p>Produto não encontrado.</p></div>;

  return (
    <div className="container py-4">
      <nav className="mb-4" style={{ fontSize: '0.85rem' }}>
        <Link to="/produtos" className="text-muted text-decoration-none">Produtos</Link>
        <span className="text-muted mx-2">/</span>
        {product.category?.name && <><Link to={`/produtos?categoria=${product.categoryId}`} className="text-muted text-decoration-none">{product.category.name}</Link><span className="text-muted mx-2">/</span></>}
        <span className="text-dark fw-medium">{product.name}</span>
      </nav>

      <div className="row g-5">
        <div className="col-md-6">
          <div style={{ borderRadius: 20, overflow: 'hidden', background: '#f5f5f5', border: '1px solid rgba(0,0,0,0.06)' }}>
            {product.imageUrl ? (
              <img src={product.imageUrl} style={{ width: '100%', height: 440, objectFit: 'cover', display: 'block' }} alt={product.name} />
            ) : (
              <div className="d-flex align-items-center justify-content-center text-muted" style={{ height: 440 }}>
                <div className="text-center">
                  <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📦</div>
                  <span>Sem imagem disponível</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="col-md-6">
          <div style={{ display: 'grid', gap: 20 }}>
            <div>
              {product.category?.name && (
                <span className="badge bg-light text-dark mb-2" style={{ fontSize: '0.75rem', fontWeight: 500, padding: '6px 12px', borderRadius: 8 }}>
                  {product.category.name}
                </span>
              )}
              <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#111', margin: '8px 0 4px', lineHeight: 1.2 }}>
                {product.name}
              </h1>
              {product.description && (
                <p style={{ color: '#666', fontSize: '0.95rem', lineHeight: 1.6 }}>{product.description}</p>
              )}
            </div>

            <div style={{ background: '#fafafa', borderRadius: 16, padding: '20px 24px', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div className="d-flex align-items-end gap-2 mb-3">
                <span style={{ fontSize: '2rem', fontWeight: 700, color: '#111', lineHeight: 1 }}>
                  {formatCurrency(product.price)}
                </span>
                <span className="text-muted" style={{ fontSize: '0.85rem', paddingBottom: 4 }}>à vista</span>
              </div>

              <div className="d-flex align-items-center gap-2 mb-3">
                <span style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: product.stock > 0 ? '#10b981' : '#ef4444',
                  display: 'inline-block'
                }} />
                <span style={{ fontSize: '0.85rem', color: product.stock > 0 ? '#065f46' : '#991b1b', fontWeight: 500 }}>
                  {product.stock > 0 ? `${product.stock} unidade${product.stock > 1 ? 's' : ''} em estoque` : 'Indisponível'}
                </span>
              </div>

              <button
                onClick={handleAdd}
                disabled={!product.stock || added}
                className="btn w-100"
                style={{
                  background: added ? '#10b981' : '#111',
                  color: '#fff', padding: '14px', fontSize: '1rem', fontWeight: 600,
                  borderRadius: 12, border: 'none', transition: 'all .2s'
                }}
                onMouseEnter={e => { if (!added) e.target.style.background = '#000'; }}
                onMouseLeave={e => { if (!added) e.target.style.background = '#111'; }}>
                {added ? '✓ Adicionado ao carrinho!' : 'Adicionar ao Carrinho'}
              </button>

              <Link to="/carrinho" className="btn btn-outline-dark w-100 mt-2" style={{ borderRadius: 12, padding: '12px' }}>
                Ir para o Carrinho
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
