import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';

import { brandAssets, brand } from '../lib/brandAssets';
import { useCart } from '../state/CartContext';
import { useStoreAuth } from '../state/StoreAuthContext';

const BRAND_NAME = brand.name;
const BRAND_THEME_COLOR = brand.colors.primary;

export function StoreLayout() {
  const location = useLocation();
  const { totalItems } = useCart();
  const { customer, isAuthenticated } = useStoreAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isCartUpdated, setIsCartUpdated] = useState(false);
  const scrollRafRef = useRef(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isAuthRoute = location.pathname === '/entrar';
  const isCheckoutRoute = location.pathname.startsWith('/checkout');

  useEffect(() => {
    document.documentElement.dataset.theme = 'light';
    document.documentElement.style.colorScheme = 'light';
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    themeMeta?.setAttribute('content', BRAND_THEME_COLOR);
    setFavicon(brandAssets.symbolBlue);
  }, []);

  useEffect(() => {
    function handleScroll() {
      if (scrollRafRef.current) return;
      scrollRafRef.current = requestAnimationFrame(() => {
        setIsScrolled(window.scrollY > 24);
        scrollRafRef.current = null;
      });
    }

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    };
  }, []);

  useEffect(() => {
    setIsCartUpdated(true);
    const timeoutId = window.setTimeout(() => {
      setIsCartUpdated(false);
    }, 420);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [totalItems]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 720 && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileMenuOpen]);

  const primaryLinks = useMemo(
    () => [
      { to: '/', label: 'Home' },
      { to: '/produtos', label: 'Produtos' },
      { to: '/sobre', label: 'Sobre' },
    ],
    [],
  );

  return (
    <div
      className={`store-shell store${isAuthRoute ? ' store-shell-auth' : ''}${
        isCheckoutRoute ? ' store-shell-checkout' : ''
      }`}
    >
      {isCheckoutRoute ? (
        <header className="checkout-header store__checkout-header">
          <Link to="/" className="brand-link store__brand-link" aria-label="Ir para a home da Thessara">
            <BrandLogo variant="symbol" className="brand-logo-placeholder--compact" />
            <span className="brand-wordmark store__brand-wordmark">Thessara</span>
          </Link>

          <div className="checkout-header-actions">
            <span>Checkout seguro</span>
            <Link to="/carrinho" className="checkout-header-link">
              Voltar ao carrinho
            </Link>
          </div>
        </header>
      ) : null}

      {!isAuthRoute && !isCheckoutRoute ? (
        <>
        <header className={`store-header store__header${isScrolled ? ' is-scrolled' : ''}`}>
        <Link to="/" className="brand-link store__brand-link" aria-label="Ir para a home da Thessara">
          <BrandLogo />
          <div className="brand-wordmark-wrap store__brand-wordmark-wrap">
            <span className="brand-subline store__brand-subline">
              Joias delicadas e cheias de significado
            </span>
          </div>
        </Link>

          <button
            type="button"
            className="store-hamburger store__hamburger"
            aria-label="Abrir menu"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

        <div className="store-header-actions store__header-actions">
          <nav id="store-navigation" className="store-nav store__nav">
            {primaryLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => navClassName(isActive)}
              >
                {link.label}
              </NavLink>
            ))}

            <NavLink to="/carrinho" className={({ isActive }) => navClassName(isActive)}>
              <CartIcon className="store-nav-icon" />
              <span className="store-nav-cart-label">Carrinho</span>
              <span className={`cart-pill${isCartUpdated ? ' is-updated' : ''}`}>{totalItems}</span>
            </NavLink>

            {isAuthenticated ? (
              <NavLink to="/minha-conta" className={({ isActive }) => navClassName(isActive)}>
                {customer?.name?.split(' ')[0] || 'Conta'}
              </NavLink>
            ) : (
              <NavLink to="/entrar" className={({ isActive }) => navClassName(isActive)}>
                Entrar
              </NavLink>
            )}
          </nav>
        </div>
        </header>

          <div
            className={`store-mobile-overlay store__mobile-overlay${isMobileMenuOpen ? ' is-visible' : ''}`}
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside
            className={`store-mobile-sidebar store__mobile-sidebar${isMobileMenuOpen ? ' is-open' : ''}`}
            aria-label="Menu de navegação"
          >
            <div className="store-mobile-sidebar-header store__mobile-sidebar-header">
              <span className="store-mobile-sidebar-title">Menu</span>
              <button
                type="button"
                className="store-mobile-sidebar-close store__mobile-sidebar-close"
                aria-label="Fechar menu"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="store-mobile-sidebar-nav store__mobile-sidebar-nav">
              {primaryLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  className={({ isActive }) => `store-mobile-sidebar-link${isActive ? ' is-active' : ''}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </NavLink>
              ))}
              <NavLink
                to="/carrinho"
                className={({ isActive }) => `store-mobile-sidebar-link${isActive ? ' is-active' : ''}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Carrinho
                <span className="cart-pill">{totalItems}</span>
              </NavLink>
              {isAuthenticated ? (
                <NavLink
                  to="/minha-conta"
                  className={({ isActive }) => `store-mobile-sidebar-link${isActive ? ' is-active' : ''}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {customer?.name?.split(' ')[0] || 'Conta'}
                </NavLink>
              ) : (
                <NavLink
                  to="/entrar"
                  className={({ isActive }) => `store-mobile-sidebar-link${isActive ? ' is-active' : ''}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Entrar
                </NavLink>
              )}
            </nav>
            {isAuthenticated ? (
              <div className="store-mobile-sidebar-footer store__mobile-sidebar-footer">
                <Link to="/" className="store-mobile-sidebar-logout" onClick={() => setIsMobileMenuOpen(false)}>
                  Sair
                </Link>
              </div>
            ) : null}
          </aside>
        </>
      ) : null}

      <main
        className={`store-main store__main${isAuthRoute ? ' store-main-auth' : ''}${
          isCheckoutRoute ? ' store-main-checkout' : ''
        }`}
      >
        <Outlet />
      </main>

      {!isAuthRoute && !isCheckoutRoute ? (
        <footer className="store-footer store__footer">
        <div className="store-footer-inner store__footer-inner">
          <section className="store-footer-brand store__footer-brand" aria-label="Thessara">
            <BrandLogo variant="footer" className="brand-logo-placeholder--footer" />
            <p>Peças pensadas para acompanhar sua rotina com leveza, elegância e brilho.</p>
          </section>

          <nav className="store-footer-nav store__footer-nav" aria-label="Rodape">
            <Link to="/">Home</Link>
            <Link to="/produtos">Produtos</Link>
            <Link to="/sobre">Sobre</Link>
            <Link to="/carrinho">Carrinho</Link>
            <Link to="/entrar">Conta</Link>
            <Link to="/privacidade">Privacidade</Link>
            <Link to="/termos">Termos</Link>
          </nav>

          <section className="store-footer-contact store__footer-contact" aria-label="Atendimento">
            <span>Atendimento</span>
            <a href={`mailto:${brand.email.contact}`}>{brand.email.contact}</a>
            <a
              href={brand.social.instagram}
              className="store-footer-social-link"
              target="_blank"
              rel="noreferrer noopener"
              aria-label="Instagram da Thessara"
            >
              <InstagramIcon />
              Instagram
            </a>
            <a
              href={`https://wa.me/${brand.phone.store}`}
              className="store-footer-social-link"
              target="_blank"
              rel="noreferrer noopener"
              aria-label={`WhatsApp da ${brand.name}`}
            >
              WhatsApp
            </a>
          </section>
        </div>

        <div className="store-footer-bottom store__footer-bottom">
          <span>© {new Date().getFullYear()} Thessara</span>
          <span className="store-footer-legal-links store__footer-legal-links">
            <Link to="/privacidade">Privacidade</Link>
            <Link to="/termos">Termos de compra</Link>
          </span>
        </div>
        </footer>
      ) : null}

      {!isAuthRoute && !isCheckoutRoute ? <CookieConsent /> : null}
    </div>
  );
}

const BrandLogo = memo(function BrandLogo({ className = '', variant = 'horizontal' }) {
  const src =
    variant === 'footer'
      ? brandAssets.logoHorizontalOffWhite
      : variant === 'symbol'
        ? brandAssets.symbolBlue
        : brandAssets.logoHorizontalBlue;
  const dimensions =
    variant === 'symbol'
      ? { width: 444, height: 473 }
      : { width: 1093, height: 383 };

  return (
    <img
      className={`brand-logo brand-logo--${variant} brand-logo-placeholder ${className}`.trim()}
      src={src}
      alt={BRAND_NAME}
      width={dimensions.width}
      height={dimensions.height}
      loading={variant === 'footer' ? 'lazy' : 'eager'}
      decoding="async"
      fetchpriority={variant === 'horizontal' ? 'high' : 'auto'}
    />
  );
});

function navClassName(isActive) {
  return `store-nav-link store__nav-link${isActive ? ' is-active' : ''}`;
}

function setFavicon(iconHref) {
  const rels = ['icon', 'shortcut icon'];

  rels.forEach((rel) => {
    let link = document.head.querySelector(`link[rel="${rel}"]`);

    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', rel);
      document.head.appendChild(link);
    }

    link.setAttribute('type', 'image/svg+xml');
    link.setAttribute('href', iconHref);
  });
}

function InstagramIcon() {
  return (
    <svg
      className="store-footer-social-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r="1.1" />
    </svg>
  );
}
