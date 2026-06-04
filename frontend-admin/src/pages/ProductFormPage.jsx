import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { AdminLayout } from '../components/AdminLayout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ProductForm } from '../components/ProductForm';
import {
  createProduct,
  getCategories,
  getProductById,
  updateProduct,
  uploadProductImage,
} from '../services/api';

export function ProductFormPage({ mode }) {
  const navigate = useNavigate();
  const { productId } = useParams();
  const [initialProduct, setInitialProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(mode === 'edit');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    getCategories()
      .then((data) => {
        if (active) {
          setCategories(data);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.message || 'Não foi possível carregar as categorias.');
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (mode !== 'edit' || !productId) {
      return;
    }

    let active = true;

    getProductById(productId)
      .then((product) => {
        if (!active) {
          return;
        }

        if (!product) {
          setError('Produto não encontrado.');
          setLoading(false);
          return;
        }

        setInitialProduct(product);
        setLoading(false);
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.message || 'Não foi possível carregar o produto.');
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [mode, productId]);

  async function handleSubmit(payload) {
    setBusy(true);
    setError('');

    try {
      const requestPayload = { ...payload };

      if (payload.galleryImageFiles?.length) {
        const uploadedGalleryImages = await Promise.all(
          payload.galleryImageFiles.map((file) => uploadProductImage(file)),
        );

        requestPayload.galleryImageUrls = [
          ...(payload.galleryImageUrls || []),
          ...uploadedGalleryImages.map((uploadResult) => uploadResult.imageUrl).filter(Boolean),
        ];
        requestPayload.galleryImageFiles = [];
      }

      if (mode === 'edit' && productId) {
        await updateProduct(productId, requestPayload);
      } else {
        await createProduct(requestPayload);
      }

      navigate('/produtos', { replace: true });
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível salvar o produto.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminLayout
      title={mode === 'edit' ? 'Editar Produto' : 'Novo Produto'}
      subtitle={
        mode === 'edit' ? 'Atualização padronizada do catálogo' : 'Cadastro padronizado do catálogo'
      }
      actions={
        <Link className="button button-secondary" to="/produtos">
          Voltar
        </Link>
      }
    >
      {loading ? <LoadingSpinner variant="dual-ring" text="Carregando produto..." /> : null}
      {error ? <div className="panel feedback feedback-error">{error}</div> : null}
      {!loading && !categories.length ? (
        <div className="panel feedback feedback-error">
          Cadastre uma categoria antes de salvar produtos.
        </div>
      ) : null}

      {!loading ? (
        <ProductForm
          initialValues={initialProduct}
          categories={categories}
          onSubmit={handleSubmit}
          submitLabel={mode === 'edit' ? 'Salvar Produto' : 'Salvar Produto'}
          busy={busy}
        />
      ) : null}
    </AdminLayout>
  );
}
