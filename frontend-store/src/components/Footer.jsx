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
        <p className="text-center small mb-0">
          &copy; {new Date().getFullYear()} {brand.name} &mdash; Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
