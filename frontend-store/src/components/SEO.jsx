import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import { brand } from '../lib/brandAssets';

const SITE_URL = (import.meta.env.VITE_SITE_URL || brand.storeUrl).replace(/\/$/, '');
const DEFAULT_IMAGE = `${SITE_URL}${brand.seo.ogImage}`;
const THEME_COLOR = brand.colors.primary;
const BRAND_NAME = brand.name;

const routeMeta = {
  '/': {
    title: 'Thessara | Semijoias e Acessórios Femininos com Elegância',
    description:
      'Descubra semijoias e acessórios femininos com curadoria elegante para presentear, marcar momentos especiais e elevar sua beleza todos os dias.',
    type: 'website',
  },
  '/produtos': {
    title: 'Semijoias e Acessórios Femininos | Thessara',
    description:
       'Explore anéis, colares, brincos e pulseiras da Thessara com uma vitrine pensada para facilitar sua escolha com delicadeza e sofisticação.',
    type: 'website',
  },
  '/sobre': {
    title: 'Sobre a Thessara | Propósito, Elegância e Significado',
    description:
       'Conheça o propósito da Thessara e a forma como nossas semijoias valorizam a beleza única de cada mulher com elegância, delicadeza e autenticidade.',
    type: 'profile',
  },
  '/privacidade': {
    title: 'Política de Privacidade | Thessara',
    description:
      'Entenda como a Thessara trata dados pessoais, cookies, pedidos, atendimento, pagamentos e direitos previstos na LGPD.',
    type: 'website',
  },
  '/termos': {
    title: 'Termos de Compra | Thessara',
    description:
       'Consulte regras de compra, pagamento, entrega, troca, devolução e atendimento no e-commerce da Thessara.',
    type: 'website',
  },
  '/carrinho': {
    title: 'Carrinho | Thessara',
    description: 'Revise os produtos selecionados antes de finalizar sua compra na Thessara.',
    noindex: true,
  },
  '/checkout': {
    title: 'Checkout seguro | Thessara',
    description:
      'Finalize seu pedido na Thessara com seguranca e acompanhe a confirmação do pagamento.',
    noindex: true,
  },
  '/entrar': {
    title: 'Area do cliente | Thessara',
    description: 'Entre ou cadastre seus dados para acompanhar pedidos e atendimento na Thessara.',
    noindex: true,
  },
};

function getMetaForPath(pathname) {
  if (pathname.startsWith('/produtos/')) {
    return {
      title: 'Detalhe da Semijoia | Thessara',
      description:
        'Veja os detalhes da semijoia escolhida, acompanhe disponibilidade e adicione a peca ao seu carrinho na Thessara.',
      type: 'product',
    };
  }

  if (pathname.startsWith('/checkout/pagamento/') || pathname.startsWith('/pedido-confirmado/')) {
    return {
      title: 'Pagamento do Pedido | Thessara',
      description: 'Acompanhe o status do pagamento e confirmacao do seu pedido Thessara.',
      noindex: true,
    };
  }

  if (pathname.startsWith('/pedido/obrigada/')) {
    return {
      title: 'Obrigada pela sua compra | Thessara',
      description:
        'Pedido confirmado com sucesso. Confira o resumo da compra e siga acompanhando sua experiencia com a Thessara.',
      noindex: true,
    };
  }

  if (routeMeta[pathname]) {
    return routeMeta[pathname];
  }

  return {
    title: 'Página não encontrada | Thessara',
    description:
      'A página solicitada não existe ou foi movida. Continue navegando pela coleção da Thessara.',
    noindex: true,
  };
}

function upsertMeta(selector, createTag, updateTag) {
  let tag = document.head.querySelector(selector);

  if (!tag) {
    tag = createTag();
    document.head.appendChild(tag);
  }

  updateTag(tag);
}

function setMetaName(name, content) {
  upsertMeta(
    `meta[name="${name}"]`,
    () => {
      const tag = document.createElement('meta');
      tag.setAttribute('name', name);
      return tag;
    },
    (tag) => tag.setAttribute('content', content),
  );
}

function setMetaProperty(property, content) {
  upsertMeta(
    `meta[property="${property}"]`,
    () => {
      const tag = document.createElement('meta');
      tag.setAttribute('property', property);
      return tag;
    },
    (tag) => tag.setAttribute('content', content),
  );
}

function setLink(rel, href) {
  upsertMeta(
    `link[rel="${rel}"]`,
    () => {
      const tag = document.createElement('link');
      tag.setAttribute('rel', rel);
      return tag;
    },
    (tag) => tag.setAttribute('href', href),
  );
}

function setStructuredData(data) {
  const id = 'thessara-route-schema';
  let script = document.getElementById(id);

  if (!script) {
    script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }

  script.textContent = JSON.stringify(data);
}

export function SEO() {
  const { pathname } = useLocation();
  const meta = useMemo(() => getMetaForPath(pathname), [pathname]);

  useEffect(() => {
    const canonical = `${SITE_URL}${pathname === '/' ? '' : pathname}`;
    const robots = meta.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large';
    const title = meta.title.includes(BRAND_NAME) ? meta.title : `${meta.title} | ${BRAND_NAME}`;

    document.documentElement.lang = 'pt-BR';
    document.title = title;

    setMetaName('description', meta.description);
    setMetaName('robots', robots);
    setMetaName('theme-color', THEME_COLOR);
    setMetaName('twitter:site', brand.social.twitter);
    setMetaProperty('og:locale', 'pt_BR');
    setMetaProperty('og:site_name', BRAND_NAME);
    setMetaProperty('og:type', meta.type || 'website');
    setMetaProperty('og:title', title);
    setMetaProperty('og:description', meta.description);
    setMetaProperty('og:url', canonical);
    setMetaProperty('og:image', DEFAULT_IMAGE);
    setMetaProperty('og:image:alt', 'Identidade visual da Thessara');
    setMetaName('twitter:card', 'summary_large_image');
    setMetaName('twitter:title', title);
    setMetaName('twitter:description', meta.description);
    setMetaName('twitter:image', DEFAULT_IMAGE);
    setLink('canonical', canonical);

    setStructuredData({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'JewelryStore',
          '@id': `${SITE_URL}/#store`,
          name: BRAND_NAME,
          url: SITE_URL,
          image: DEFAULT_IMAGE,
          email: brand.email.contact,
          areaServed: 'BR',
          priceRange: '$$',
          sameAs: [brand.social.instagram, `https://wa.me/${brand.phone.store}`],
        },
        {
          '@type': 'WebSite',
          '@id': `${SITE_URL}/#website`,
          name: BRAND_NAME,
          url: SITE_URL,
          publisher: {
            '@id': `${SITE_URL}/#store`,
          },
          potentialAction: {
            '@type': 'SearchAction',
            target: `${SITE_URL}/produtos?busca={search_term_string}`,
            'query-input': 'required name=search_term_string',
          },
        },
        {
          '@type': 'WebPage',
          '@id': `${canonical}#webpage`,
          url: canonical,
          name: title,
          description: meta.description,
          isPartOf: {
            '@id': `${SITE_URL}/#website`,
          },
        },
      ],
    });
  }, [meta, pathname]);

  return null;
}
