import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

import { AdminNotificationsBell } from './AdminNotificationsBell';
import { useConfirmDialog } from './ConfirmDialog';
import { clearAdminToken } from '../lib/auth';
import { brandAssets } from '../lib/brandAssets';
import { brand } from '../lib/brandAssets';
import { getAdminNotifications } from '../services/api';

const STORE_PUBLIC_URL = (import.meta.env.VITE_STORE_PUBLIC_URL || 'http://localhost:5600').replace(
  /\/$/,
  '',
);

const PAGE_HEADER_TONES = [
  { match: 'dashboard', className: 'is-dashboard' },
  { match: 'categoria', className: 'is-categories' },
  { match: 'produto', className: 'is-products' },
  { match: 'pedido', className: 'is-orders' },
  { match: 'aviso', className: 'is-alerts' },
  { match: 'cliente', className: 'is-customers' },
];

export function AdminLayout({ title, subtitle, actions, children }) {
  const navigate = useNavigate();
  const { confirm, confirmDialog } = useConfirmDialog();
  const titleInitial = title?.trim()?.charAt(0)?.toUpperCase() || 'T';
  const headerTone =
    PAGE_HEADER_TONES.find((tone) => title?.toLowerCase().includes(tone.match))?.className ||
    'is-default';
  const [notificationsPayload, setNotificationsPayload] = useState({
    counts: { total: 0, danger: 0, warning: 0 },
    notifications: [],
  });
  const [notificationsError, setNotificationsError] = useState('');
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const latestNotificationId = useRef('');

  useEffect(() => {
    let active = true;
    let timerId;

    async function loadNotifications() {
      setNotificationsLoading(true);

      try {
        const payload = await getAdminNotifications();

        if (!active) {
          return;
        }

        const latestNotification = payload.notifications?.[0] || null;
        const latestId = latestNotification?.id || '';

        setNotificationsPayload(payload);
        setNotificationsError('');

        latestNotificationId.current = latestId;
      } catch (requestError) {
        if (active) {
          setNotificationsError(requestError.message || 'Não foi possível carregar alertas.');
        }
      } finally {
        if (active) {
          setNotificationsLoading(false);
        }
      }
    }

    loadNotifications();
    timerId = window.setInterval(loadNotifications, 30000);

    return () => {
      active = false;
      window.clearInterval(timerId);
    };
  }, []);

  const headerActions = useMemo(
    () => (
      <>
        {actions}
        <AdminNotificationsBell
          payload={notificationsPayload}
          error={notificationsError}
          isLoading={notificationsLoading}
        />
      </>
    ),
    [actions, notificationsError, notificationsLoading, notificationsPayload],
  );

  async function handleLogout() {
    const confirmed = await confirm({
      title: 'Sair do painel?',
      message: 'Você será desconectado do painel administrativo.',
      confirmLabel: 'Sair',
      cancelLabel: 'Continuar aqui',
      tone: 'warning',
    });

    if (!confirmed) {
      return;
    }

    clearAdminToken();
    navigate('/', { replace: true });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <img
            src={brandAssets.symbolBlue}
            alt={brand.name}
          />
          <h1 className="brand-title">{brand.name}</h1>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className={({ isActive }) => navLinkClassName(isActive)}>
            <strong>Dashboard</strong>
          </NavLink>
          <NavLink to="/categorias" className={({ isActive }) => navLinkClassName(isActive)}>
            <strong>Categorias</strong>
          </NavLink>
          <NavLink to="/produtos" className={({ isActive }) => navLinkClassName(isActive)}>
            <strong>Produtos</strong>
          </NavLink>
          <NavLink to="/pedidos" className={({ isActive }) => navLinkClassName(isActive)}>
            <strong>Pedidos</strong>
          </NavLink>
          <NavLink to="/avisos" className={({ isActive }) => navLinkClassName(isActive)}>
            <strong>Avisos</strong>
          </NavLink>
          <NavLink to="/clientes" className={({ isActive }) => navLinkClassName(isActive)}>
            <strong>Clientes</strong>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <a
            className="button button-primary sidebar-store-link"
            href={STORE_PUBLIC_URL}
            target="_blank"
            rel="noreferrer"
          >
            Ver loja
          </a>
          <button
            type="button"
            className="button button-secondary sidebar-logout"
            onClick={handleLogout}
          >
            Sair
          </button>
        </div>
      </aside>

      <div className="content-shell">
        <header className={`page-header panel glass-panel ${headerTone}`}>
          <div className="page-title-block">
            <span className="page-title-mark" aria-hidden="true">
              <span>{titleInitial}</span>
            </span>
            <div className="page-title-copy">
              {subtitle ? <p className="eyebrow">{subtitle}</p> : null}
              <h2>{title}</h2>
            </div>
          </div>
          <div className="page-actions">{headerActions}</div>
        </header>

        <main className="page-content">{children}</main>
      </div>
      {confirmDialog}
    </div>
  );
}

function navLinkClassName(isActive) {
  return `nav-link${isActive ? ' is-active' : ''}`;
}
