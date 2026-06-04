import { useEffect, useState } from 'react';

import { resolveAssetUrl } from '../lib/assets';

const initialState = {
  name: '',
  description: '',
  price: '',
  stock: '',
  visible: true,
  categoryId: '',
  images: [],
  coverImageKey: '',
  hasVariants: false,
  variants: [],
};

function buildImageKey(type, value, index) {
  return `${type}-${value}-${index}`;
}

function buildInitialImages(product = {}) {
  const images = [];
  const mainImageUrl = product.imageUrl || '';

  if (mainImageUrl) {
    images.push({
      key: buildImageKey('main', mainImageUrl, 0),
      type: 'url',
      src: resolveAssetUrl(mainImageUrl),
      imageUrl: mainImageUrl,
      label: 'Capa atual',
    });
  }

  for (const [index, image] of (product.images || []).entries()) {
    if (!image?.imageUrl || image.imageUrl === mainImageUrl) {
      continue;
    }

    images.push({
      key: buildImageKey('gallery', image.imageUrl, index),
      type: 'url',
      src: resolveAssetUrl(image.imageUrl),
      imageUrl: image.imageUrl,
      label: 'Imagem salva',
    });
  }

  return images;
}

function buildVariantPayload(variants = []) {
  return variants
    .map((variant) => ({
      id: variant.id,
      name: String(variant.name || '').trim(),
      price: Number(variant.price),
      stock: Number(variant.stock || 0),
      sku: String(variant.sku || '').trim(),
      active: true,
    }))
    .filter((variant) => variant.name && Number.isFinite(variant.price) && variant.price >= 0);
}

function resolveMainPrice(price, variants) {
  const parsedPrice = Number(price);

  if (variants.length) {
    return Math.min(...variants.map((variant) => variant.price));
  }

  if (price !== '' && Number.isFinite(parsedPrice) && parsedPrice >= 0) {
    return parsedPrice;
  }

  return parsedPrice;
}

function resolveMainStock(stock, variants) {
  const parsedStock = Number(stock);

  if (variants.length) {
    return variants.reduce(
      (total, variant) => total + Math.max(0, Math.floor(Number(variant.stock || 0))),
      0,
    );
  }

  if (stock !== '' && Number.isFinite(parsedStock) && parsedStock >= 0) {
    return Math.floor(parsedStock);
  }

  return parsedStock;
}

export function ProductForm({ initialValues, categories, onSubmit, submitLabel, busy }) {
  const [values, setValues] = useState(initialState);
  const [validationMessage, setValidationMessage] = useState('');
  const variantPayload = buildVariantPayload(values.variants);
  const productVariants = values.hasVariants ? variantPayload : [];

  useEffect(() => {
    if (!initialValues) {
      setValues(initialState);
      return;
    }

    const images = buildInitialImages(initialValues);
    const variants = (initialValues.variants || [])
      .filter((variant) => variant.active !== false)
      .map((variant) => ({
        id: variant.id,
        name: variant.name || '',
        price: String(variant.price ?? ''),
        stock: String(variant.stock ?? ''),
        sku: variant.sku || '',
      }));

    setValues({
      name: initialValues.name || '',
      description: initialValues.description || '',
      price: String(initialValues.price ?? ''),
      stock: String(initialValues.stock ?? ''),
      visible: initialValues.visible === undefined ? true : Boolean(initialValues.visible),
      categoryId: String(initialValues.categoryId ?? ''),
      images,
      coverImageKey: images[0]?.key || '',
      hasVariants: variants.length > 0,
      variants,
    });
  }, [initialValues]);

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((currentValues) => ({ ...currentValues, [name]: value }));
  }

  function handleVariantsModeChange(event) {
    const checked = event.target.checked;

    setValues((currentValues) => ({
      ...currentValues,
      hasVariants: checked,
      variants:
        checked && !currentValues.variants.length
          ? [
              {
                name: '',
                price: '',
                stock: '0',
                sku: '',
              },
            ]
          : currentValues.variants,
    }));
    setValidationMessage('');
  }

  function handleImagesChange(event) {
    const files = Array.from(event.target.files || []);

    if (!files.length) {
      return;
    }

    setValues((currentValues) => {
      const uploadedImages = files.map((file, index) => ({
        key: buildImageKey('file', `${file.name}-${file.lastModified}`, Date.now() + index),
        type: 'file',
        src: URL.createObjectURL(file),
        file,
        label: file.name,
      }));
      const images = [...currentValues.images, ...uploadedImages];

      return {
        ...currentValues,
        images,
        coverImageKey: currentValues.coverImageKey || images[0]?.key || '',
      };
    });

    event.target.value = '';
  }

  function handleRemoveImage(imageKey) {
    setValues((currentValues) => {
      const images = currentValues.images.filter((image) => image.key !== imageKey);
      const removedCover = currentValues.coverImageKey === imageKey;

      return {
        ...currentValues,
        images,
        coverImageKey: removedCover ? images[0]?.key || '' : currentValues.coverImageKey,
      };
    });
  }

  function handleSetCover(imageKey) {
    setValues((currentValues) => ({
      ...currentValues,
      coverImageKey: imageKey,
    }));
  }

  function handleAddVariant() {
    setValues((currentValues) => ({
      ...currentValues,
      variants: [
        ...currentValues.variants,
        {
          name: '',
          price: currentValues.price || '',
          stock: '0',
          sku: '',
        },
      ],
    }));
  }

  function handleVariantChange(index, field, value) {
    setValues((currentValues) => ({
      ...currentValues,
      variants: currentValues.variants.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, [field]: value } : variant,
      ),
    }));
  }

  function handleRemoveVariant(index) {
    setValues((currentValues) => ({
      ...currentValues,
      variants: currentValues.variants.filter((_, variantIndex) => variantIndex !== index),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (values.hasVariants && !productVariants.length) {
      setValidationMessage('Adicione pelo menos uma variação com tamanho e preço antes de salvar.');
      return;
    }

    setValidationMessage('');

    const coverImage =
      values.images.find((image) => image.key === values.coverImageKey) || values.images[0] || null;
    const galleryImages = values.images.filter((image) => image.key !== coverImage?.key);

    await onSubmit({
      name: values.name.trim(),
      description: values.description.trim(),
      price: resolveMainPrice(values.price, productVariants),
      stock: resolveMainStock(values.stock, productVariants),
      visible: values.visible,
      categoryId: Number(values.categoryId),
      imageUrl: coverImage?.type === 'url' ? coverImage.imageUrl : '',
      imageFile: coverImage?.type === 'file' ? coverImage.file : null,
      galleryImageUrls: galleryImages
        .filter((image) => image.type === 'url')
        .map((image) => image.imageUrl)
        .filter(Boolean),
      galleryImageFiles: galleryImages
        .filter((image) => image.type === 'file')
        .map((image) => image.file)
        .filter(Boolean),
      variants: productVariants,
    });
  }

  return (
    <form className="panel form-layout form-panel" onSubmit={handleSubmit}>
      <div className="form-intro">
        <div>
          <p className="eyebrow">Ficha do produto</p>
          <h3>Informações principais</h3>
          <p>Preencha os dados do item mantendo o cadastro consistente e facil de revisar depois.</p>
        </div>
        <div className="form-hint">
          Preço, estoque, categoria e imagem são obrigatórios para uma vitrine consistente.
        </div>
      </div>

      <div className="field-group">
        <label className="variation-mode-toggle" htmlFor="hasVariants">
          <input
            id="hasVariants"
            name="hasVariants"
            type="checkbox"
            checked={values.hasVariants}
            onChange={handleVariantsModeChange}
          />
          <span className="variation-mode-control" aria-hidden="true" />
          <span>
            <strong>Produto com variações</strong>
            <small>Ative quando o item tiver tamanho, aro ou outro tipo de opção.</small>
          </span>
        </label>

        <div className="field">
          <label htmlFor="name">Nome</label>
          <input id="name" name="name" value={values.name} onChange={handleChange} required />
        </div>

        <div className="field">
          <label htmlFor="description">Descrição</label>
          <textarea
            id="description"
            name="description"
            value={values.description}
            onChange={handleChange}
            rows="4"
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="price">Preço</label>
            <input
              id="price"
              name="price"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={values.price}
              onChange={handleChange}
              required={!values.hasVariants}
              disabled={values.hasVariants}
            />
            {values.hasVariants ? (
              <p className="field-help">
                Bloqueado porque este produto usa variações. A loja usa o menor preço dos tamanhos.
              </p>
            ) : null}
          </div>

          <div className="field">
            <label htmlFor="stock">Estoque</label>
            <input
              id="stock"
              name="stock"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={values.stock}
              onChange={handleChange}
              required={!values.hasVariants}
              disabled={values.hasVariants}
            />
            {values.hasVariants ? (
              <p className="field-help">
                Bloqueado porque este produto usa variações. O estoque será somado pelos tamanhos.
              </p>
            ) : null}
          </div>
        </div>

        <div className="field">
          <label htmlFor="categoryId">Categoria</label>
          <select
            id="categoryId"
            name="categoryId"
            value={values.categoryId}
            onChange={handleChange}
            required
          >
            <option value="">Selecione uma categoria</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <p className="field-help">
            Escolha manualmente a categoria para evitar cadastro no grupo errado.
          </p>
        </div>

        <div className="field">
          <label className="variation-mode-toggle" htmlFor="visible">
            <input
              id="visible"
              name="visible"
              type="checkbox"
              checked={values.visible}
              onChange={(event) =>
                setValues((current) => ({ ...current, visible: event.target.checked }))
              }
            />
            <span className="variation-mode-control" aria-hidden="true" />
            <span>
              <strong>Produto visível na loja</strong>
              <small>Desative para ocultar o produto do catálogo sem precisar excluir.</small>
            </span>
          </label>
        </div>

        <div className="field file-field">
          <label htmlFor="productImages">Imagens do produto</label>
          <div className="file-control">
            <input
              className="file-input"
              id="productImages"
              name="productImages"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleImagesChange}
            />
            <span className="file-name">
              {values.images.length
                ? `${values.images.length} imagem(ns) selecionada(s)`
                : 'Nenhuma imagem selecionada'}
            </span>
          </div>
          <p className="field-help">
            Suba uma ou mais fotos e marque qual delas sera usada como capa do produto.
          </p>
        </div>
      </div>

      {values.hasVariants ? (
        <div className="product-variants-editor">
          <div className="form-intro form-intro-compact">
            <div>
              <p className="eyebrow">Tamanhos e preços</p>
              <h3>Variações do produto</h3>
              <p>
                Use esta área quando a mesma peça tiver tamanhos com preço ou estoque diferente.
              </p>
            </div>
            <button type="button" className="button button-secondary" onClick={handleAddVariant}>
              Adicionar tamanho
            </button>
          </div>

          {validationMessage ? <p className="form-error">{validationMessage}</p> : null}

          <div className="variant-list">
            {values.variants.map((variant, index) => (
                <div className="variant-row" key={variant.id || index}>
                  <div className="field">
                    <label htmlFor={`variant-name-${index}`}>Tamanho</label>
                    <input
                      id={`variant-name-${index}`}
                      value={variant.name}
                      placeholder="P, M, G, 38..."
                      onChange={(event) => handleVariantChange(index, 'name', event.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor={`variant-price-${index}`}>Preço</label>
                    <input
                      id={`variant-price-${index}`}
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={variant.price}
                      onChange={(event) => handleVariantChange(index, 'price', event.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor={`variant-stock-${index}`}>Estoque</label>
                    <input
                      id={`variant-stock-${index}`}
                      type="number"
                      min="0"
                      step="1"
                      inputMode="numeric"
                      value={variant.stock}
                      onChange={(event) => handleVariantChange(index, 'stock', event.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor={`variant-sku-${index}`}>SKU opcional</label>
                    <input
                      id={`variant-sku-${index}`}
                      value={variant.sku}
                      onChange={(event) => handleVariantChange(index, 'sku', event.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="button button-secondary variant-remove"
                    onClick={() => handleRemoveVariant(index)}
                  >
                    Remover
                  </button>
                </div>
              ))}
          </div>
        </div>
      ) : null}

      {values.images.length ? (
        <div className="gallery-preview-grid">
          {values.images.map((image) => {
            const isCover = image.key === values.coverImageKey;

            return (
              <article
                key={image.key}
                className={`gallery-preview-card ${isCover ? 'is-cover' : ''}`}
              >
                <img src={image.src} alt={image.label} />
                <strong>{isCover ? 'Capa' : 'Imagem extra'}</strong>
                <button
                  type="button"
                  className={isCover ? 'button button-primary' : 'button button-secondary'}
                  onClick={() => handleSetCover(image.key)}
                  disabled={isCover}
                >
                  {isCover ? 'Capa selecionada' : 'Definir como capa'}
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => handleRemoveImage(image.key)}
                >
                  Remover
                </button>
              </article>
            );
          })}
        </div>
      ) : null}

      <button type="submit" className="button button-primary" disabled={busy || !categories.length}>
        {busy ? 'Salvando...' : submitLabel}
      </button>
    </form>
  );
}
