import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  addCartItem,
  CART_UPDATED_EVENT,
  clearCart,
  getCartItems,
  getCartSummary,
  removeCartItem,
  updateCartItemQuantity,
} from '../utils/cart';
import { resolveAssetUrl } from '../lib/assets';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [summary, setSummary] = useState(() => getCartSummary());

  useEffect(() => {
    function syncCart() {
      setSummary(getCartSummary());
    }

    syncCart();
    window.addEventListener(CART_UPDATED_EVENT, syncCart);
    window.addEventListener('storage', syncCart);

    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, syncCart);
      window.removeEventListener('storage', syncCart);
    };
  }, []);

  const addItem = useCallback((product, quantity = 1, variant = null) => {
    const sellable = variant || product;
    const result = addCartItem({
      productId: product.id,
      variantId: variant?.id || null,
      variantName: variant?.name || '',
      name: product.name,
      price: sellable.price,
      quantity,
      imageUrl: resolveAssetUrl(product.imageUrl || product.images?.[0]?.imageUrl || ''),
      stock: sellable.stock,
    });
    setSummary(getCartSummary());
    return result;
  }, []);

  const removeItem = useCallback((productId, variantId = null) => {
    removeCartItem(productId, variantId);
    setSummary(getCartSummary());
  }, []);

  const updateQuantity = useCallback((productId, quantity, stock, variantId = null) => {
    const result = updateCartItemQuantity(productId, quantity, stock, variantId);
    setSummary(getCartSummary());
    return result;
  }, []);

  const clear = useCallback(() => {
    clearCart();
    setSummary(getCartSummary());
  }, []);

  const hasItem = useCallback((productId, variantId = null) => {
    const itemId = variantId ? `${Number(productId)}:${Number(variantId)}` : String(Number(productId));
    return getCartItems().some((item) => item.id === itemId);
  }, []);

  const value = useMemo(
    () => ({
      items: summary.items,
      totalItems: summary.totalItems,
      totalPrice: summary.totalPrice,
      addItem,
      removeItem,
      updateQuantity,
      clear,
      hasItem,
    }),
    [
      addItem,
      clear,
      hasItem,
      removeItem,
      summary.items,
      summary.totalItems,
      summary.totalPrice,
      updateQuantity,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart precisa ser usado dentro de CartProvider.');
  }

  return context;
}
