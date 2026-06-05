import { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getStoreProducts, getStoreCategories } from '../services/api';
import { ProductCard } from '../components/ProductCard';
import { ProductCardSkeleton } from '../components/Skeleton';

const PER_PAGE = 8;

export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const categoryId = searchParams.get('categoria');

  useEffect(() => {
    Promise.all([getStoreProducts(categoryId ? { categoryId } : {}), getStoreCategories()])
      .then(([pData, cData]) => {
        setProducts(Array.isArray(pData) ? pData : pData.data || []);
        setCategories(Array.isArray(cData) ? cData : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [categoryId]);

  useEffect(() => { setPage(1); }, [categoryId, search]);

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));
  }, [products, search]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="container py-4">
      <h2 className="mb-1">Produtos</h2>
      <p className="text-muted mb-3">{filtered.length} produto{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}</p>

      <div className="row g-3 mb-4 align-items-end">
        <div className="col-md-6">
          <input className="form-control" placeholder="Buscar produtos..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ borderRadius: 12, padding: '12px 16px', fontSize: '0.95rem' }} />
        </div>
        <div className="col-md-6">
          <div className="d-flex gap-2 flex-wrap">
            <Link to="/produtos" className={`btn btn-sm ${!categoryId ? 'btn-dark' : 'btn-outline-dark'}`} style={{ borderRadius: 10 }}>
              Todos
            </Link>
            {categories.filter(c => c.visible).map(cat => (
              <Link key={cat.id} to={`/produtos?categoria=${cat.id}`}
                className={`btn btn-sm ${Number(categoryId) === cat.id ? 'btn-dark' : 'btn-outline-dark'}`} style={{ borderRadius: 10 }}>
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="row g-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="col-6 col-md-4 col-lg-3" style={{ animation: `fade-in-up 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 0.05}s both` }}>
              <ProductCardSkeleton />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="row g-4">
            {paginated.map(product => (
              <div key={product.id} className="col-6 col-md-4 col-lg-3">
                <ProductCard product={product} />
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="col-12 text-center py-5">
                <p className="text-muted mb-0">Nenhum produto encontrado.</p>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <nav className="d-flex justify-content-center mt-5 gap-1">
              <button className="btn btn-outline-dark btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ borderRadius: 10 }}>
                Anterior
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i}
                  className={`btn btn-sm ${page === i + 1 ? 'btn-dark' : 'btn-outline-dark'}`}
                  onClick={() => setPage(i + 1)} style={{ borderRadius: 10, minWidth: 40 }}>
                  {i + 1}
                </button>
              ))}
              <button className="btn btn-outline-dark btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={{ borderRadius: 10 }}>
                Próximo
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
