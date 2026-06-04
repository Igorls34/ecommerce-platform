import { Navigate, useLocation } from 'react-router-dom';

import { isAuthenticated } from '../lib/auth';

export function ProtectedRoute({ children }) {
  const location = useLocation();

  if (!isAuthenticated()) {
    return (
      <Navigate
        to="/"
        replace
        state={{
          from: `${location.pathname}${location.search || ''}`,
          message: 'Sessao expirada ou acesso negado. Entre novamente para continuar.',
        }}
      />
    );
  }

  return children;
}
