import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_DIALOG = {
  title: 'Confirmar ação',
  message: 'Deseja continuar?',
  confirmLabel: 'Confirmar',
  cancelLabel: 'Cancelar',
  tone: 'warning',
};

export function useConfirmDialog() {
  const [dialog, setDialog] = useState(null);
  const resolverRef = useRef(null);

  const closeDialog = useCallback((result) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setDialog(null);
  }, []);

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialog({ ...DEFAULT_DIALOG, ...options });
    });
  }, []);

  const confirmDialog = dialog ? (
    <ConfirmDialog dialog={dialog} onCancel={() => closeDialog(false)} onConfirm={() => closeDialog(true)} />
  ) : null;

  return { confirm, confirmDialog };
}

function ConfirmDialog({ dialog, onCancel, onConfirm }) {
  const confirmButtonRef = useRef(null);

  useEffect(() => {
    confirmButtonRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onCancel();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div className="admin-confirm-overlay" role="presentation" onMouseDown={onCancel}>
      <div
        className={`admin-confirm-modal is-${dialog.tone}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        aria-describedby="admin-confirm-message"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="admin-confirm-mark" aria-hidden="true">
          !
        </div>
        <div className="admin-confirm-copy">
          <h3 id="admin-confirm-title">{dialog.title}</h3>
          <p id="admin-confirm-message">{dialog.message}</p>
        </div>
        <div className="admin-confirm-actions">
          <button type="button" className="button button-secondary" onClick={onCancel}>
            {dialog.cancelLabel}
          </button>
          <button
            type="button"
            className={dialog.tone === 'danger' ? 'button button-danger' : 'button button-primary'}
            onClick={onConfirm}
            ref={confirmButtonRef}
          >
            {dialog.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
