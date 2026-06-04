import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { getStoreCustomerProfile, STORE_AUTH_EXPIRED_EVENT } from '../services/api';

const StoreAuthContext = createContext(null);

const TOKEN_KEY = 'storeCustomerToken';
const CUSTOMER_KEY = 'storeCustomer';

function readStoredCustomer() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOMER_KEY) || 'null');
  } catch {
    return null;
  }
}

export function StoreAuthProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '');
  const [customer, setCustomer] = useState(readStoredCustomer);
  const [isLoadingAuth, setIsLoadingAuth] = useState(() =>
    Boolean(localStorage.getItem(TOKEN_KEY)),
  );

  function login(authData) {
    localStorage.setItem(TOKEN_KEY, authData.token);
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(authData.customer));
    setToken(authData.token);
    setCustomer(authData.customer);
    setIsLoadingAuth(false);
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CUSTOMER_KEY);
    setToken('');
    setCustomer(null);
    setIsLoadingAuth(false);
  }

  function logout() {
    clearSession();
  }

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY) || '';

    if (!storedToken) {
      setIsLoadingAuth(false);
      return undefined;
    }

    let active = true;
    setIsLoadingAuth(true);

    getStoreCustomerProfile(storedToken, { skipAuthExpired: true })
      .then((profile) => {
        if (!active) {
          return;
        }

        localStorage.setItem(CUSTOMER_KEY, JSON.stringify(profile));
        setToken(storedToken);
        setCustomer(profile);
      })
      .catch((requestError) => {
        if (active && [401, 403].includes(Number(requestError.status))) {
          clearSession();
        }
      })
      .finally(() => {
        if (active) {
          setIsLoadingAuth(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function handleAuthExpired(event) {
      const message =
        event.detail?.message || 'Sua sessão expirou. Entre novamente para continuar.';
      const currentPath = `${location.pathname}${location.search || ''}`;

      clearSession();

      if (location.pathname !== '/entrar') {
        navigate('/entrar', {
          replace: true,
          state: {
            from: currentPath || '/produtos',
            message,
          },
        });
      }
    }

    window.addEventListener(STORE_AUTH_EXPIRED_EVENT, handleAuthExpired);

    return () => {
      window.removeEventListener(STORE_AUTH_EXPIRED_EVENT, handleAuthExpired);
    };
  }, [location.pathname, location.search, navigate]);

  const value = useMemo(
    () => ({
      token,
      customer,
      isAuthenticated: Boolean(token && customer),
      isLoadingAuth,
      login,
      logout,
    }),
    [token, customer, isLoadingAuth],
  );

  return <StoreAuthContext.Provider value={value}>{children}</StoreAuthContext.Provider>;
}

export function useStoreAuth() {
  const context = useContext(StoreAuthContext);

  if (!context) {
    throw new Error('useStoreAuth deve ser usado dentro de StoreAuthProvider.');
  }

  return context;
}
