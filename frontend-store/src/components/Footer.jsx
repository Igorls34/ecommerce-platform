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

      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
        display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end'
      }}>
        <a href="https://wa.me/5524998574876?text=Olá!%20Vi%20seu%20trabalho%20no%20white-label%20ecommerce."
          target="_blank" rel="noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#25D366', color: '#fff', padding: '10px 20px',
            borderRadius: 50, fontWeight: 600, fontSize: '0.82rem',
            textDecoration: 'none', boxShadow: '0 4px 16px rgba(37,211,102,0.35)',
            transition: 'transform .2s, box-shadow .2s'
          }}
          onMouseEnter={e => { e.target.style.transform = 'scale(1.05)'; e.target.style.boxShadow = '0 6px 20px rgba(37,211,102,0.45)'; }}
          onMouseLeave={e => { e.target.style.transform = 'scale(1)'; e.target.style.boxShadow = '0 4px 16px rgba(37,211,102,0.35)'; }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          Falar com o Dev
        </a>
        <a href="https://igordev-portfolio-ofc.netlify.app/"
          target="_blank" rel="noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#1a1a2e', color: '#fff', padding: '10px 20px',
            borderRadius: 50, fontWeight: 500, fontSize: '0.82rem',
            textDecoration: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            border: '1px solid rgba(255,255,255,0.08)',
            transition: 'transform .2s, box-shadow .2s'
          }}
          onMouseEnter={e => { e.target.style.transform = 'scale(1.05)'; e.target.style.boxShadow = '0 6px 20px rgba(0,0,0,0.35)'; }}
          onMouseLeave={e => { e.target.style.transform = 'scale(1)'; e.target.style.boxShadow = '0 4px 16px rgba(0,0,0,0.25)'; }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Portfólio
        </a>
      </div>

    </footer>
  );
}
