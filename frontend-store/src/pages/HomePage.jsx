import { Link } from 'react-router-dom';
import { brand } from '../lib/brandAssets';

export function HomePage() {
  return (
    <>
      <section className="hero text-center">
        <div className="container">
          <h1>{brand.name}</h1>
          <p className="mb-5">{brand.tagline}</p>
          <div className="d-flex justify-content-center gap-3 flex-wrap">
            <Link className="btn btn-light btn-lg" to="/produtos">Ver Produtos</Link>
            <Link className="btn btn-outline-light btn-lg" to="/conta">Minha Conta</Link>
          </div>
        </div>
      </section>

      <section className="py-5">
        <div className="container py-4">
          <div className="row g-4 text-center">
            <div className="col-md-4 feature">
              <div className="feature-icon">✦</div>
              <h5>Curadoria Exclusiva</h5>
              <p>Produtos selecionados com os melhores fornecedores para garantir qualidade e estilo.</p>
            </div>
            <div className="col-md-4 feature">
              <div className="feature-icon">⚡</div>
              <h5>Pagamento Rápido</h5>
              <p>PIX com 5% de desconto ou cartão de crédito à vista. Seguro e sem complicação.</p>
            </div>
            <div className="col-md-4 feature">
              <div className="feature-icon">📦</div>
              <h5>Entrega Nacional</h5>
              <p>Enviamos para todo o Brasil com código de rastreio para você acompanhar.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
