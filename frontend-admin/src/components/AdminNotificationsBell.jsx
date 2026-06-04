import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

// O layout consome alertas operacionais a cada poucos segundos.

function formatTime(value) {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function AdminNotificationsBell({ payload, error, isLoading }) {
  const [open, setOpen] = useState(false);
  const shellRef = useRef(null);

  const importantCount = useMemo(
    () => Number(payload.counts?.danger || 0) + Number(payload.counts?.warning || 0),
    [payload.counts],
  );
  const totalCount = importantCount || Number(payload.counts?.total || 0);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (shellRef.current?.contains(event.target)) {
        return;
      }

      setOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div className="notification-shell" ref={shellRef}>
      <button
        type="button"
        className={`notification-trigger${importantCount ? ' has-alerts' : ''}`}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Alertas do admin"
      >
        <span className="notification-icon" aria-hidden="true">
          Alertas
        </span>
        <span className="notification-count">{totalCount}</span>
      </button>

      {open ? (
        <div className="notification-panel" role="dialog" aria-label="Alertas do painel">
          <div className="notification-head">
            <strong>Alertas do painel</strong>
            <div className="notification-head-actions">
              <span>{isLoading ? 'Atualizando...' : 'Atualiza a cada 30s'}</span>
              <button
                type="button"
                className="notification-close"
                onClick={() => setOpen(false)}
                aria-label="Fechar alertas"
              >
                Fechar
              </button>
            </div>
          </div>

          {error ? <div className="notification-error">{error}</div> : null}

          {payload.notifications?.length ? (
            <div className="notification-list">
              {payload.notifications.slice(0, 10).map((notification) => (
                <article
                  key={notification.id}
                  className={`notification-item is-${notification.severity}`}
                >
                  <div>
                    <strong>{notification.title}</strong>
                    <p>{notification.message}</p>
                    <span>{formatTime(notification.createdAt)}</span>
                  </div>
                  {notification.actionUrl ? (
                    <Link
                      className="notification-action"
                      to={notification.actionUrl}
                      onClick={() => setOpen(false)}
                    >
                      {notification.actionLabel || 'Abrir'}
                    </Link>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="notification-empty">Nenhum alerta por enquanto.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function AdminNotificationToast({ notification, onClose }) {
  if (!notification) {
    return null;
  }

  return (
    <aside
      className={`notification-toast is-${notification.severity}`}
      role="status"
      aria-live="polite"
    >
      <div>
        <span>Nova notificacao</span>
        <strong>{notification.title}</strong>
        <p>{notification.message}</p>
      </div>
      <div className="notification-toast-actions">
        {notification.actionUrl ? (
          <Link to={notification.actionUrl} onClick={onClose}>
            {notification.actionLabel || 'Abrir'}
          </Link>
        ) : null}
        <button type="button" onClick={onClose} aria-label="Fechar notificação">
          x
        </button>
      </div>
    </aside>
  );
}
