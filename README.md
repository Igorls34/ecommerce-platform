# Ecommerce Platform — White Label

Plataforma de ecommerce white-label reutilizável, pronta para demonstração comercial e aceleração de novos projetos.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend Loja | React 18, Vite 7, Bootstrap 5, React Router 6 |
| Frontend Admin | React 18, Vite 7, Bootstrap 5, React Router 6 |
| Backend | Express 5, TypeScript, Prisma ORM 6 |
| Banco | MySQL 8 |
| Autenticação | JWT |
| Pagamento | PIX local (EMV/BR Code) + Stripe + Mercado Pago (providers prontos) |
| Email | SMTP configurável (Brevo, Mailtrap, Gmail) |
| Frete | Melhor Envio API |

---

## Estrutura

```
├── brand.config.js              Config mestre da marca
├── backend/                     API REST
│   ├── src/controllers/
│   ├── src/services/            Email, pagamentos, frete, storage
│   ├── src/middlewares/         Auth JWT, rate limiter, upload
│   ├── src/lib/brand.ts         Config de marca (backend)
│   └── prisma/schema.prisma     16 tabelas
├── frontend-store/              Loja pública
│   ├── src/pages/               7 páginas
│   ├── src/components/          Navbar, Footer, ProductCard, Skeleton, DemoBanner
│   ├── src/state/               CartContext, StoreAuthContext
│   ├── src/lib/brandAssets.js   Config de marca
│   └── src/styles/custom.css
├── frontend-admin/              Painel administrativo
│   ├── src/pages/               7 páginas
│   ├── src/lib/brandAssets.js   Config de marca
│   └── src/admin.css
├── scripts/                     Ngrok, deploy, compartilhamento
├── deploy/vps/                  Scripts deploy, nginx, PM2
└── brands/                      Assets de marca (logos, favicons)
```

---

## Funcionalidades

### Loja
- Catálogo com busca, filtro por categoria e paginação
- Carrinho com ajuste de quantidade e resumo lateral
- Checkout com gate de login automático
- Pagamento PIX com QR Code e código copia e cola (5% desconto)
- Polling automático de confirmação de pagamento
- Cadastro e login de clientes (JWT)
- Lazy loading em todas as páginas
- Skeleton loading, animações e empty states
- Design responsivo com menu hamburger mobile
- Popup demo com countdown para apresentação

### Admin
- Dashboard com 6 métricas (produtos, pedidos, faturamento, ticket médio)
- CRUD completo de produtos com upload de imagem
- CRUD de categorias com toggle visibilidade
- Lista de pedidos com filtros por status e badges coloridos
- Detalhe do pedido com fluxo de processamento
- Configurações da loja
- Lazy loading e skeleton loading
- Sidebar escura com navegação

### API
- REST com autenticação JWT dupla (admin + cliente)
- PIX local sem dependência de gateway externo
- Bootstrap automático de admin e categoria padrão
- Pronto para Stripe e Mercado Pago

---

## Início Rápido

```bash
# Instalar dependências
npm install
npm --prefix backend install
npm --prefix frontend-store install
npm --prefix frontend-admin install

# Configurar banco
cp backend/.env.example backend/.env
# Editar DATABASE_URL no .env

# Criar banco e rodar migrations
npm --prefix backend run migrate:deploy

# Popular dados demo
node seed-realista.js

# Iniciar desenvolvimento
npm run dev            # Backend (3333) + Admin (5500)
npm run dev:store      # Loja (5600)
```

---

## URLs Locais

| Serviço | URL |
|---|---|
| Loja | http://localhost:5600 |
| Admin | http://localhost:5500 → `/entrar` |
| API | http://localhost:3333/health |

---

## Acesso Admin

```
Email: admin@exemplo.com
Senha: admin123
```

---

## Banco de Dados

```
MySQL: root / root123
Database: ecommerce_platform
Tabelas: 16
```

### Tabelas principais
`AdminUser`, `Customer`, `Category`, `Product`, `ProductImage`, `ProductVariant`, `Order`, `OrderItem`, `OrderEvent`, `StoreSettings`, `FiscalDocument`, `MelhorEnvioTokenState`

---

## Comandos

```bash
npm run dev             # Dev mode (backend + admin)
npm run dev:store       # Loja apenas
npm run build:all       # Build produção de tudo
npm run share           # Ngrok tunnel + painel de compartilhamento
npm run share:stop      # Para ngrok
npm run lint            # ESLint
npm run format          # Prettier
```

---

## White Label — Novo Cliente

1. **Editar identidade** (3 arquivos):
   - `frontend-store/src/lib/brandAssets.js`
   - `frontend-admin/src/lib/brandAssets.js`
   - `backend/src/lib/brand.ts`
   
   Campos: `name`, `email`, `phone`, `social`, `colors`, `pix`, `domain`

2. **Trocar logos** em `frontend-store/public/brand/`

3. **Criar backend/.env** com chaves de API do cliente

4. **Popular produtos** via admin ou `node seed-realista.js`

5. **Deploy** na VPS com `deploy/vps/deploy.sh`

---

## Design System

| Elemento | Valor |
|---|---|
| Paleta | Slate Profissional (`#0f172a`, `#1e293b`, `#6366f1`) |
| Fonte | Inter (400–800) |
| Ícones | Emoji + SVG inline |
| Animações | `fade-in-up`, `skeleton-shimmer`, `scale-in` |
| Responsivo | Breakpoints 768px / 576px |
| Lazy Loading | `React.lazy()` + `Suspense` em todas as páginas |

---

## Links do Desenvolvedor

| Canal | Link |
|---|---|
| WhatsApp | [+55 24 99857-4876](https://wa.me/5524998574876) |
| Instagram | [@igor_devofc](https://instagram.com/igor_devofc) |
| Portfólio | [igordev-portfolio-ofc.netlify.app](https://igordev-portfolio-ofc.netlify.app) |
| Email | igorlaurindo49@gmail.com |

---

## Licença

Projeto privado — uso exclusivo para clientes da plataforma.
