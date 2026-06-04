import { Link, useLocation } from 'react-router-dom';

export function NotFoundPage() {
  const { pathname } = useLocation();

  return (
    <section className="not-found-page">
      <div className="not-found-copy">
        <p className="section-eyebrow">Erro 404</p>
        <h1>Página não encontrada.</h1>
        <p>
          O endereço <strong>{pathname}</strong> não existe ou pode ter sido movido. Continue pela
           coleção ou volte para a página inicial.
        </p>
        <div className="not-found-actions">
          <Link to="/produtos" className="button-primary">
            Ver produtos
          </Link>
          <Link to="/" className="button-secondary">
            Voltar ao início
          </Link>
        </div>
      </div>

      <div className="not-found-code" aria-hidden="true">
        404
      </div>
    </section>
  );
}
