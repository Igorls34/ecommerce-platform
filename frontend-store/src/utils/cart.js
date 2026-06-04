const CART_STORAGE_KEY = 'eliane_store_cart';
export const CART_UPDATED_EVENT = 'eliane:cart-updated';

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function normalizeCartItem(item) {
  const stock = Number(item.stock);
  const productId = Number(item.productId);
  const variantId =
    item.variantId === undefined || item.variantId === null || item.variantId === ''
      ? null
      : Number(item.variantId);

  return {
    id: variantId ? `${productId}:${variantId}` : String(productId),
    productId,
    variantId: variantId && Number.isFinite(variantId) ? variantId : null,
    variantName: String(item.variantName || ''),
    name: String(item.name || ''),
    price: Number(item.price || 0),
    quantity: Math.max(1, Number(item.quantity || 1)),
    imageUrl: item.imageUrl || '',
    stock: Number.isFinite(stock) ? Math.max(0, stock) : null,
  };
}

function limitQuantityByStock(quantity, stock) {
  const normalizedQuantity = Math.max(1, Number(quantity || 1));

  if (stock === null || stock === undefined) {
    return normalizedQuantity;
  }

  return Math.min(normalizedQuantity, Math.max(0, Number(stock)));
}

export function getCartItems() {
  if (!isBrowser()) {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(CART_STORAGE_KEY);

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.map(normalizeCartItem);
  } catch {
    return [];
  }
}

function persistCartItems(items) {
  if (!isBrowser()) {
    return items;
  }

  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT, { detail: items }));
  return items;
}

export function addCartItem(item) {
  const currentItems = getCartItems();
  const normalizedItem = normalizeCartItem(item);
  const existingItem = currentItems.find((entry) => entry.id === normalizedItem.id);
  const stock = normalizedItem.stock;

  if (stock !== null && stock <= 0) {
    return {
      items: currentItems,
      addedQuantity: 0,
      error: 'Produto indisponivel no momento.',
    };
  }

  if (existingItem) {
    const nextQuantity = limitQuantityByStock(
      existingItem.quantity + normalizedItem.quantity,
      stock,
    );
    const addedQuantity = Math.max(0, nextQuantity - existingItem.quantity);
    const items = persistCartItems(
      currentItems.map((entry) =>
        entry.id === normalizedItem.id
          ? { ...entry, quantity: nextQuantity, stock }
          : entry,
      ),
    );

    return {
      items,
      addedQuantity,
      error: addedQuantity < normalizedItem.quantity ? `Estoque máximo disponível: ${stock}.` : '',
    };
  }

  const quantity = limitQuantityByStock(normalizedItem.quantity, stock);
  const items = persistCartItems([...currentItems, { ...normalizedItem, quantity }]);

  return {
    items,
    addedQuantity: quantity,
    error: quantity < normalizedItem.quantity ? `Estoque máximo disponível: ${stock}.` : '',
  };
}

export function updateCartItemQuantity(productId, quantity, stockOverride, variantId = null) {
  const normalizedQuantity = Number(quantity);
  const itemId = variantId ? `${Number(productId)}:${Number(variantId)}` : String(Number(productId));

  if (!Number.isFinite(normalizedQuantity) || normalizedQuantity <= 0) {
    return {
      items: removeCartItem(productId, variantId),
      quantity: 0,
      error: '',
    };
  }

  let nextQuantity = normalizedQuantity;
  let error = '';

  const items = getCartItems().map((item) =>
    item.id === itemId
      ? (() => {
          const stock = stockOverride === undefined ? item.stock : stockOverride;
          nextQuantity = limitQuantityByStock(normalizedQuantity, stock);

          if (stock !== null && stock !== undefined && normalizedQuantity > stock) {
            error = `Estoque máximo disponível: ${stock}.`;
          }

          return { ...item, quantity: nextQuantity, stock };
        })()
      : item,
  );

  return {
    items: persistCartItems(items),
    quantity: nextQuantity,
    error,
  };
}

export function removeCartItem(productId, variantId = null) {
  const itemId = variantId ? `${Number(productId)}:${Number(variantId)}` : String(Number(productId));
  const items = getCartItems().filter((item) => item.id !== itemId);
  return persistCartItems(items);
}

export function clearCart() {
  return persistCartItems([]);
}

export function getCartSummary() {
  const items = getCartItems();

  return {
    items,
    totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
    totalPrice: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  };
}
