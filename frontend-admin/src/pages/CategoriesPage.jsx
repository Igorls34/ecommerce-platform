import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';

import { AdminLayout } from '../components/AdminLayout';
import { useConfirmDialog } from '../components/ConfirmDialog';
import { resolveAssetUrl } from '../lib/assets';
import { deleteCategory, getCategories } from '../services/api';

export function CategoriesPage() {
  const location = useLocation();
  const [categories, setCategories] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(location.state?.feedback || '');
  const { confirm, confirmDialog } = useConfirmDialog();

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      const data = await getCategories();
      setCategories(data);
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível carregar as categorias.');
    }
  }

  async function handleDelete(category) {
    const confirmed = await confirm({
      title: 'Excluir categoria?',
      message: `A categoria "${category.name}" será removida do catálogo.`,
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
      tone: 'danger',
    });

    if (!confirmed) {
      return;
    }

    setActiveId(category.id);
    setError('');
    setSuccess('');

    try {
      await deleteCategory(category.id);
      setSuccess('Categoria excluída com sucesso.');

      await loadCategories();
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível excluir a categoria.');
    } finally {
      setActiveId(null);
    }
  }

  return (
    <AdminLayout
      title="Categorias"
      subtitle="Organização do catálogo"
      actions={
        <Link className="button button-primary" to="/categorias/nova">
          Nova Categoria
        </Link>
      }
    >
      {error ? <div className="panel feedback feedback-error">{error}</div> : null}
      {success ? <div className="panel feedback feedback-success">{success}</div> : null}
      {confirmDialog}

      <section className="page-summary--split">
        <article className="panel page-summary__card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Organizacao</p>
              <h3>Base do catálogo</h3>
            </div>
          </div>

          <div className="page-summary__body">
            <div className="page-summary__stat">
              <span>Total</span>
              <strong>{categories.length}</strong>
            </div>
            <p className="page-summary__text">
              Mantenha grupos simples e claros para facilitar cadastro, busca e leitura dos
              produtos.
            </p>
          </div>
        </article>

        <article className="panel page-summary__card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Edicao individual</p>
              <h3>Paineis dedicados</h3>
            </div>
          </div>

          <div className="page-summary__body">
            <p className="page-summary__text">
              Crie uma categoria nova ou abra uma categoria existente para editar nome e imagem em
              uma tela propria.
            </p>
            <Link className="button button-primary" to="/categorias/nova">
              Criar categoria
            </Link>
          </div>
        </article>
      </section>

      <section className="panel category-list-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Categorias</p>
            <h3>Lista cadastrada</h3>
          </div>
          <div className="table-summary">{categories.length} categoria(s)</div>
        </div>

        {categories.length ? (
          <div className="categories-grid">
            {categories.map((category) => (
              <article key={category.id} className="category-card">
                <span className="category-card-id">#{category.id}</span>
                {category.imageUrl ? (
                  <div className="category-image-preview-block">
                    <img src={resolveAssetUrl(category.imageUrl)} alt={category.name} className="category-image-preview" />
                  </div>
                ) : null}
                <strong>{category.name}</strong>
                <span className={`category-visibility-badge ${category.visible === false ? 'category-visibility-hidden' : ''}`}>
                  {category.visible === false ? 'Invisivel na loja' : 'Visivel na loja'}
                </span>
                <span className="category-card-meta">
                  {category._count?.products || 0} produto(s) vinculado(s).
                </span>
                <div className="category-card-actions">
                  <Link
                    className="button button-secondary"
                    to={`/categorias/${category.id}/editar`}
                  >
                    Editar
                  </Link>
                  <button
                    type="button"
                    className="button button-secondary button-danger"
                    disabled={activeId === category.id}
                    onClick={() => handleDelete(category)}
                  >
                    {activeId === category.id ? 'Excluindo...' : 'Excluir'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>Nenhuma categoria cadastrada.</h3>
            <p>Crie ao menos uma categoria para organizar os produtos.</p>
          </div>
        )}
      </section>
    </AdminLayout>
  );
}
