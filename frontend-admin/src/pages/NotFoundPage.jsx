import { Link, useLocation } from 'react-router-dom';

import { AdminLayout } from '../components/AdminLayout';

export function NotFoundPage() {
  const { pathname } = useLocation();

  return (
    <AdminLayout title="Página não encontrada" subtitle="Erro 404">
      <section className="admin-not-found panel glass-panel">
        <div className="admin-not-found-copy">
          <p className="eyebrow">Rota invalida</p>
          <h3>Esta área do painel não existe.</h3>
          <p>
            O endereço <strong>{pathname}</strong> não corresponde a nenhuma tela administrativa.
            Volte para uma area segura do painel.
          </p>
          <div className="admin-not-found-actions">
            <Link to="/dashboard" className="button button-primary">
              Ir para dashboard
            </Link>
            <Link to="/produtos" className="button button-secondary">
              Ver produtos
            </Link>
          </div>
        </div>

        <div className="admin-not-found-code" aria-hidden="true">
          404
        </div>
      </section>
    </AdminLayout>
  );
}
