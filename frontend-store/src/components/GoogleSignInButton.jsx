import { useEffect, useRef, useState } from 'react';

// Login com Google desativado por enquanto.
// Este componente foi mantido para facilitar reativacao futura.

const GOOGLE_SCRIPT_ID = 'google-identity-services';

function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID);

    if (existingScript) {
      existingScript.addEventListener('load', resolve, { once: true });
      existingScript.addEventListener('error', reject, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = GOOGLE_SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export function GoogleSignInButton({ onCredential, disabled }) {
  const buttonRef = useRef(null);
  const [error, setError] = useState('');
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!googleClientId || disabled) {
      return undefined;
    }

    let active = true;

    loadGoogleScript()
      .then(() => {
        if (!active || !buttonRef.current) {
          return;
        }

        buttonRef.current.innerHTML = '';
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response) => {
            if (response.credential) {
              onCredential(response.credential);
            }
          },
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          width: Math.min(360, buttonRef.current.offsetWidth || 320),
        });
      })
      .catch(() => {
        if (active) {
          setError('Não foi possível carregar o login Google.');
        }
      });

    return () => {
      active = false;
    };
  }, [googleClientId, disabled, onCredential]);

  if (!googleClientId) {
    return null;
  }

  return (
    <>
      <div className="google-signin-slot" ref={buttonRef} aria-busy={disabled ? 'true' : 'false'} />
      {error ? <div className="feedback-error auth-feedback">{error}</div> : null}
    </>
  );
}
