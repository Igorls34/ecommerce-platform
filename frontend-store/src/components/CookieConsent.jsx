import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const COOKIE_CONSENT_KEY = 'thessara_cookie_consent';

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const storedConsent = window.localStorage.getItem(COOKIE_CONSENT_KEY);

    setIsVisible(!storedConsent);
  }, []);

  function saveConsent(consent) {
    window.localStorage.setItem(
      COOKIE_CONSENT_KEY,
      JSON.stringify({
        consent,
        savedAt: new Date().toISOString(),
      }),
    );
    setIsVisible(false);
  }

  if (!isVisible) {
    return null;
  }

  return (
    <aside className="cookie-consent" aria-label="Aviso de cookies">
      <div className="cookie-consent-copy">
        <span>Privacidade</span>
        <p>
           Usamos cookies essenciais para manter carrinho, sessão e segurança da compra. Cookies
          opcionais de analise ou marketing so devem ser ativados quando forem configurados no site.
        </p>
        <Link to="/privacidade">Ver Política de Privacidade</Link>
      </div>

      <div className="cookie-consent-actions">
        <button
          type="button"
          className="button-secondary cookie-button"
          onClick={() => saveConsent('essential')}
        >
          Apenas essenciais
        </button>
        <button
          type="button"
          className="button-primary cookie-button"
          onClick={() => saveConsent('accepted')}
        >
          Aceitar cookies
        </button>
      </div>
    </aside>
  );
}
