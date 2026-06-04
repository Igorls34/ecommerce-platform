import { useCallback, useEffect, useState } from 'react';

export function useStoreToast() {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'info') => {
    setToast({
      id: Date.now(),
      message,
      type,
    });
  }, []);

  const clearToast = useCallback(() => {
    setToast(null);
  }, []);

  return {
    toast,
    showToast,
    clearToast,
  };
}

export function StoreToast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timeout = window.setTimeout(onClose, 4500);
    return () => window.clearTimeout(timeout);
  }, [toast, onClose]);

  if (!toast) {
    return null;
  }

  const title = toast.type === 'error' ? 'Atenção' : 'Tudo certo';

  return (
    <div className={`store-toast is-${toast.type}`} role="status" aria-live="polite">
      <div>
        <strong>{title}</strong>
        <span>{toast.message}</span>
      </div>
      <button type="button" onClick={onClose} aria-label="Fechar aviso">
        x
      </button>
    </div>
  );
}
