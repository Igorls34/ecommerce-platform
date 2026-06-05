import { Link } from 'react-router-dom';
import { brand } from '../lib/brandAssets';

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="row">
          <div className="col-md-4 mb-3">
            <h5>{brand.name}</h5>
            <p className="small">{brand.tagline}</p>
          </div>
          <div className="col-md-4 mb-3">
            <h5>Links</h5>
            <ul className="list-unstyled">
              <li><Link to="/produtos" className="text-white-50">Produtos</Link></li>
              <li><Link to="/carrinho" className="text-white-50">Carrinho</Link></li>
              <li><Link to="/conta" className="text-white-50">Minha Conta</Link></li>
            </ul>
          </div>
          <div className="col-md-4 mb-3">
            <h5>Contato</h5>
            <ul className="list-unstyled small">
              <li><a href={`mailto:${brand.email.contact}`}>{brand.email.contact}</a></li>
              <li><a href={`https://wa.me/${brand.phone.store}`} target="_blank" rel="noreferrer">WhatsApp</a></li>
              <li><a href={brand.social.instagram} target="_blank" rel="noreferrer">Instagram</a></li>
            </ul>
          </div>
        </div>
        <hr style={{ borderColor: 'rgba(255,255,255,0.15)' }} />
        <p className="text-center small mb-3">
          &copy; {new Date().getFullYear()} {brand.name} &mdash; Todos os direitos reservados.
        </p>
        <div className="text-center d-flex justify-content-center gap-3 flex-wrap">
          <a href="https://wa.me/5524992241855?text=Olá!%20Vi%20seu%20trabalho%20no%20white-label%20ecommerce." target="_blank" rel="noreferrer"
            className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)' }}>
            💬 Falar com o desenvolvedor
          </a>
          <a href="https://igordev-portfolio-ofc.netlify.app/" target="_blank" rel="noreferrer"
            className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)' }}>
            🚀 Ver portfólio
          </a>
        </div>
      </div>
    </footer>
  );
}
