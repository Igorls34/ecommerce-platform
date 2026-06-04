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
    getStoreProductById(id)
      .then(data => setProduct(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  function handleAdd() {
    addItem({ productId: product.id, name: product.name, price: product.price, imageUrl: product.imageUrl, stock: product.stock });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  if (loading) return <div className="container py-5 text-center"><div className="spinner-border text-primary" /></div>;
  if (!product) return <div className="container py-5"><p>Produto não encontrado.</p></div>;

  return (
    <div className="container py-4">
      <Link to="/produtos" className="btn btn-outline-secondary btn-sm mb-3">&larr; Voltar</Link>
      <div className="row g-4">
        <div className="col-md-5">
          {product.imageUrl ? (
            <img src={product.imageUrl} className="img-fluid rounded-3" alt={product.name} />
          ) : (
            <div className="bg-light rounded-3 d-flex align-items-center justify-content-center" style={{ height: 350 }}>
              <span className="text-muted">Sem imagem</span>
            </div>
          )}
        </div>
        <div className="col-md-7">
          <h2>{product.name}</h2>
          <p className="text-muted">{product.category?.name}</p>
          <h3 className="text-primary mb-3">{formatCurrency(product.price)}</h3>
          {product.description && <p>{product.description}</p>}
          <p className={product.stock > 0 ? 'text-success' : 'text-danger'}>
            {product.stock > 0 ? `${product.stock} em estoque` : 'Indisponível'}
          </p>
          {product.stock > 0 && (
            <button className={`btn btn-lg ${added ? 'btn-success' : 'btn-primary'}`} onClick={handleAdd} disabled={added}>
              {added ? '✓ Adicionado!' : 'Adicionar ao Carrinho'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
