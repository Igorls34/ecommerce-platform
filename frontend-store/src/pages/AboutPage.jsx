import { Link } from 'react-router-dom';

import { brand } from '../lib/brandAssets';

import aboutStaticImage from '../images/imagens-staticas/estatico sobre.jpg';

const ABOUT_IMAGES = {
  main: aboutStaticImage,
  packaging:
    'https://images.unsplash.com/photo-1658278477100-ab1bbc15d2f6?auto=format&fit=crop&q=70&w=640',
  necklace:
    'https://images.unsplash.com/photo-1678146313001-0aeeadd3d755?auto=format&fit=crop&q=70&w=640',
};

export function AboutPage() {
  return (
    <div className="page-stack">
      <section className="about-hero">
        <div className="about-hero-copy">
          <p className="section-eyebrow">Nossa essência</p>
          <h1>Joias para revelar seu brilho.</h1>
          <p>
            A Thessara nasce para transformar acessórios em pequenos gestos de cuidado, beleza e
            presença no dia a dia.
          </p>
          <div className="about-hero-actions">
            <Link to="/produtos" className="button-primary">
              Ver coleção
            </Link>
          </div>
        </div>

        <div className="about-visual" aria-label="Seleção de momentos Thessara">
          <div className="about-visual-main">
            <img
              src={ABOUT_IMAGES.main}
              alt="Joias delicadas organizadas sobre tecido claro"
              loading="lazy"
              decoding="async"
            />
            <div className="about-visual-caption">
              <span>Curadoria delicada</span>
              <strong>Cuidado em cada detalhe</strong>
            </div>
          </div>
          <div className="about-visual-strip">
            <img
              src={ABOUT_IMAGES.packaging}
              alt="Caixa de joias com aneis e brincos"
              loading="lazy"
              decoding="async"
            />
            <img
              src={ABOUT_IMAGES.necklace}
              alt="Colar delicado em uso com luz suave"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </section>

      <section className="about-story">
        <div>
          <p className="section-eyebrow">Sobre nós</p>
          <h2>O Propósito Thessara</h2>
        </div>
        <div className="about-mission-copy">
          <p>
            Nossa missão na Thessara é valorizar a beleza única de cada mulher, inspirando confiança,
            autoestima e autenticidade em todos os momentos. Acreditamos que cada peça vai além do
            acessório, ela representa um sentimento, um momento especial e uma conexão com o que há
            de mais bonito no interior de cada pessoa.
          </p>
          <p>
            Nós dedicamos a criar experiências que fazem cada mulher se sentir na sua melhor versão,
            revelando sua essência com elegância, delicadeza e propósito. Mais do que joias,
            oferecemos beleza, significado e momentos que elevam o brilho de dentro para fora.
          </p>
        </div>
      </section>

      <section className="about-service-grid">
        <article>
          <span>01</span>
          <h3>Curadoria delicada</h3>
          <p>Selecionamos peças versáteis para acompanhar diferentes momentos da rotina.</p>
        </article>
        <article>
          <span>02</span>
          <h3>Acabamento atento</h3>
          <p>Valorizamos detalhes, proporção e conforto para uma experiência mais especial.</p>
        </article>
        <article>
          <span>03</span>
          <h3>Atendimento próximo</h3>
          <p>Ajudamos você a escolher presentes, combinações e peças para ocasiões importantes.</p>
        </article>
      </section>

      <section className="about-contact-band">
        <div>
          <p className="section-eyebrow">Fale conosco</p>
          <h2>Precisa de ajuda para escolher?</h2>
          <p>
            Entre em contato para tirar dúvidas sobre produtos, disponibilidade, presentes ou
            combinações para uma ocasião especial.
          </p>
        </div>
        <div className="about-contact-actions">
          <a href={`mailto:${brand.email.contact}`} className="about-contact-link">
            <span>E-mail</span>
            <strong>{brand.email.contact}</strong>
          </a>
          <a href={`https://wa.me/${brand.phone.store}`} className="about-contact-link" target="_blank" rel="noreferrer noopener">
            <span>WhatsApp</span>
            <strong>{brand.phone.display}</strong>
          </a>
        </div>
      </section>
    </div>
  );
}
