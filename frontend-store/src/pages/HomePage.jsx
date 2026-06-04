import { Link } from 'react-router-dom';
import { brand } from '../lib/brandAssets';

export function HomePage() {
  return (
    <>
      <section className="hero-section text-center">
        <div className="container">
          <h1>{brand.name}</h1>
          <p className="mb-4">{brand.tagline}</p>
          <div className="d-flex justify-content-center gap-3">
            <Link className="btn btn-light btn-lg px-4" to="/produtos">Ver Produtos</Link>
            <Link className="btn btn-outline-light btn-lg px-4" to="/conta">Minha Conta</Link>
          </div>
        </div>
      </section>

      <section className="py-5">
        <div className="container">
          <div className="row text-center g-4">
            <div className="col-md-4">
              <div className="p-4">
                <h3 className="h5">Peças Selecionadas</h3>
                <p className="text-muted small">Curadoria de semijoias com design autoral e qualidade.</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="p-4">
                <h3 className="h5">Pagamento Fácil</h3>
                <p className="text-muted small">PIX com 5% de desconto ou cartão de crédito à vista.</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="p-4">
                <h3 className="h5">Envio para Todo Brasil</h3>
                <p className="text-muted small">Entrega rápida e segura com código de rastreio.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
