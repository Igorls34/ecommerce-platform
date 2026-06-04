import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { AdminLayout } from '../components/AdminLayout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { resolveAssetUrl } from '../lib/assets';
import {
  createCategory,
  getCategoryById,
  updateCategory,
  uploadProductImage,
} from '../services/api';

export function CategoryFormPage({ mode }) {
  const navigate = useNavigate();
  const { categoryId } = useParams();
  const isEdit = mode === 'edit';
  const [form, setForm] = useState({ name: '', imageUrl: '', visible: true });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isEdit || !categoryId) {
      return undefined;
    }

    let active = true;
    setLoading(true);

    getCategoryById(categoryId)
      .then((category) => {
        if (!active) {
          return;
        }

        if (!category) {
          setError('Categoria não encontrada.');
          return;
        }

        setForm({
          name: category.name || '',
          imageUrl: category.imageUrl || '',
          visible: category.visible === undefined ? true : Boolean(category.visible),
        });
        setError('');
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.message || 'Não foi possível carregar a categoria.');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [categoryId, isEdit]);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleRemoveImage() {
    updateField('imageUrl', '');
    setSuccess('');
    setError('');
  }

  async function handleImageUpload(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const response = await uploadProductImage(file);
      updateField('imageUrl', response.imageUrl || '');
      setSuccess('Imagem da categoria enviada com sucesso.');
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível enviar a imagem da categoria.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (isEdit) {
        await updateCategory(categoryId, form);
        setSuccess('Categoria atualizada com sucesso.');
      } else {
        await createCategory(form);
        setSuccess('Categoria criada com sucesso.');
      }

      navigate('/categorias', {
        replace: true,
        state: {
          feedback: isEdit ? 'Categoria atualizada com sucesso.' : 'Categoria criada com sucesso.',
        },
      });
    } catch (requestError) {
      setError(
        requestError.message ||
          (isEdit ? 'Não foi possível atualizar a categoria.' : 'Não foi possível criar a categoria.'),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout
      title={isEdit ? 'Editar categoria' : 'Nova categoria'}
      subtitle="Cadastro individual"
      actions={
        <Link className="button button-secondary" to="/categorias">
          Voltar para categorias
        </Link>
      }
    >
      {loading ? <LoadingSpinner variant="dual-ring" text="Carregando categoria..." /> : null}
      {error ? <div className="panel feedback feedback-error">{error}</div> : null}
      {success ? <div className="panel feedback feedback-success">{success}</div> : null}

      {!loading ? (
        <section className="panel category-editor-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Categoria</p>
              <h3>{isEdit ? 'Editar dados' : 'Criar categoria'}</h3>
            </div>
          </div>

          <form className="category-editor-form" onSubmit={handleSubmit}>
            <div className="category-editor-main">
              <div className="field">
                <label htmlFor="category-name">Nome da categoria</label>
                <input
                  id="category-name"
                  className="input"
                  placeholder="Ex.: Aneis, Colares, Brincos"
                  value={form.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label className="variation-mode-toggle" htmlFor="category-visible">
                  <input
                    id="category-visible"
                    name="visible"
                    type="checkbox"
                    checked={form.visible}
                    onChange={(event) => updateField('visible', event.target.checked)}
                  />
                  <span className="variation-mode-control" aria-hidden="true" />
                  <span>
                    <strong>Categoria visível na loja</strong>
                    <small>Desative para ocultar a categoria e seus produtos do catálogo.</small>
                  </span>
                </label>
              </div>
            </div>

            <div className="category-image-editor">
              <div className="category-image-stage">
                {form.imageUrl ? (
                  <div className="category-editor-preview">
                    <img
                      src={resolveAssetUrl(form.imageUrl)}
                      alt={form.name || 'Preview da categoria'}
                    />
                  </div>
                ) : (
                  <div className="category-editor-placeholder">
                    <strong>Sem imagem</strong>
                    <span>Envie uma foto para representar esta categoria na loja.</span>
                  </div>
                )}
              </div>

              <div className="category-image-actions">
                <label className="button button-primary category-upload-field">
                  <span>{uploading ? 'Enviando...' : form.imageUrl ? 'Trocar imagem' : 'Enviar imagem'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={handleImageUpload}
                  />
                </label>
                {form.imageUrl ? (
                  <button
                    type="button"
                    className="button button-secondary"
                    disabled={uploading}
                    onClick={handleRemoveImage}
                  >
                    Remover imagem
                  </button>
                ) : null}
              </div>
            </div>

            <div className="category-editor-actions">
              <button type="submit" className="button button-primary" disabled={saving || uploading}>
                {saving ? 'Salvando...' : isEdit ? 'Salvar categoria' : 'Criar categoria'}
              </button>
              <Link className="button button-secondary" to="/categorias">
                Cancelar
              </Link>
            </div>
          </form>
        </section>
      ) : null}
    </AdminLayout>
  );
}
