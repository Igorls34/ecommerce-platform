import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

const ICONS = {
  success: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="10" fill="currentColor" opacity="0.12" />
      <path d="M6 10.5L9 13.5L14 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  error: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="10" fill="currentColor" opacity="0.12" />
      <path d="M7 7L13 13M13 7L7 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  info: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="10" fill="currentColor" opacity="0.12" />
      <path d="M10 9.5V14M10 7V7.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

const LABELS = {
  success: 'Sucesso',
  error: 'Atencao',
  info: 'Aviso',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="admin-toast-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`admin-toast is-${toast.type}`}
            role="status"
            aria-live="polite"
          >
            <span className="admin-toast-icon">{ICONS[toast.type] || ICONS.info}</span>
            <div className="admin-toast-body">
              <strong>{LABELS[toast.type] || LABELS.info}</strong>
              <span>{toast.message}</span>
            </div>
            <button type="button" className="admin-toast-close" onClick={() => removeToast(toast.id)} aria-label="Fechar aviso">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast deve ser usado dentro de ToastProvider');
  }
  return context;
}
