const LOCAL_UPLOADS_URL_PATTERN = /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?\/uploads\//i;

export function normalizeStoredAssetUrl(value: unknown) {
  const url = String(value || '').trim();

  if (!url) {
    return null;
  }

  if (LOCAL_UPLOADS_URL_PATTERN.test(url)) {
    return url.replace(LOCAL_UPLOADS_URL_PATTERN, '/uploads/');
  }

  return url;
}

export function normalizeProductAssetUrls<T extends Record<string, any> | null>(product: T): T {
  if (!product) {
    return product;
  }

  return {
    ...product,
    ...('imageUrl' in product ? { imageUrl: normalizeStoredAssetUrl(product.imageUrl) } : {}),
    images: Array.isArray(product.images)
      ? product.images.map((image: Record<string, any>) => ({
          ...image,
          ...('imageUrl' in image ? { imageUrl: normalizeStoredAssetUrl(image.imageUrl) } : {}),
        }))
      : product.images,
    category: product.category
      ? {
          ...product.category,
          ...('imageUrl' in product.category
            ? { imageUrl: normalizeStoredAssetUrl(product.category.imageUrl) }
            : {}),
        }
      : product.category,
  };
}

export function normalizeCategoryAssetUrls<T extends Record<string, any> | null>(category: T): T {
  if (!category) {
    return category;
  }

  return {
    ...category,
    ...('imageUrl' in category ? { imageUrl: normalizeStoredAssetUrl(category.imageUrl) } : {}),
  };
}
