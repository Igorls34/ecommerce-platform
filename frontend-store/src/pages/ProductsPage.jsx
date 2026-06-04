import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getStoreProducts, getStoreCategories } from '../services/api';
import { formatCurrency } from '../lib/formatters';
import { ProductCard } from '../components/ProductCard';

export function ProductsPage() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const categoryId = searchParams.get('categoria');

  useEffect(() => {
    Promise.all([getStoreProducts(categoryId ? { categoryId } : {}), getStoreCategories()])
      .then(([pData, cData]) => {
        setProducts(Array.isArray(pData) ? pData : pData.data || []);
        setCategories(Array.isArray(cData) ? cData : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [categoryId]);

  return (
    <div className="container py-4">
      <h2 className="mb-1">Produtos</h2>
      <p className="text-muted mb-4">Confira nossa coleção</p>

      <div className="d-flex gap-2 flex-wrap mb-4">
        <Link to="/produtos" className={`btn btn-sm ${!categoryId ? 'btn-primary' : 'btn-outline-primary'}`}>
          Todos
        </Link>
        {categories.filter(c => c.visible).map(cat => (
          <Link key={cat.id} to={`/produtos?categoria=${cat.id}`}
            className={`btn btn-sm ${Number(categoryId) === cat.id ? 'btn-primary' : 'btn-outline-primary'}`}>
            {cat.name}
          </Link>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
        </div>
      ) : (
        <div className="row g-4">
          {products.map(product => (
            <div key={product.id} className="col-6 col-md-4 col-lg-3">
              <ProductCard product={product} />
            </div>
          ))}
          {products.length === 0 && <p className="text-muted">Nenhum produto encontrado.</p>}
        </div>
      )}
    </div>
  );
}
