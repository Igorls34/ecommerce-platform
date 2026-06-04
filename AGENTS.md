# AGENTS.md — Contexto do Projeto Thessara

## Visão Geral

Monorepo de e-commerce para a marca **Thessara** (semijoias). Loja pública, painel admin, API própria com checkout, catálogo, pedidos, frete e integrações externas.

## Stack

- **Monorepo**: Node.js + npm workspaces
- **Backend**: Express, TypeScript, Prisma ORM, MySQL
- **Frontend-store** (loja): React 18, Vite, React Router, Sass
- **Frontend-admin** (painel): React 18, Vite, React Router, Sass
- **Pagamento**: Stripe (PIX/cartão), fallback PIX local
- **Frete**: Melhor Envio
- **Upload**: Local (multer/sharp) ou Cloudinary
- **Email**: Mailtrap / SMTP
- **Qualidade**: ESLint, Prettier, Vitest, Playwright E2E

## Estrutura de Pastas

```
project/
  backend/              API Express + Prisma
    src/controllers/    Controladores da API
    src/routes/         Rotas Express
    prisma/schema.prisma  Schema do banco
    prisma/migrations/  Migrações do Prisma
  frontend-store/       Loja pública (Vite + React)
    src/pages/          Páginas (HomePage, ProductPage, CartPage, etc.)
    src/components/     Componentes reutilizáveis
    src/styles/         Estilos Sass (pages/, components/, base/, responsive/)
    public/images/      Imagens estáticas (hero, banner, etc.)
  frontend-admin/       Painel administrativo (Vite + React)
  deploy/vps/           Scripts de deploy, nginx, PM2 ecosystem
  docs/                 Documentação
  e2e/                  Testes Playwright
  scripts/              Scripts locais (Stripe CLI, compartilhamento)
```

## Branches e Workflow

- **`develop`**: branch de trabalho. Código mais novo, alterações diárias.
- **`main`**: branch estável. Recebe merge de `develop` para deploy.
- **`origin/main`**: branch que a VPS monitora e faz pull.

### Workflow de Deploy

1. Trabalhe em `develop` (commits locais)
2. `git push origin develop`
3. `git checkout main && git merge develop && git push origin main`
4. `git checkout develop` (voltar)
5. SSH na VPS → `cd /var/www/thessara && bash deploy/vps/deploy.sh`

Script `deploy.sh` faz: `git pull origin main` → instala deps → build backend + migrate → build store + admin → pm2 reload → nginx reload.

### VPS

- **Path**: `/var/www/thessara`
- **Node**: 20/22, gerenciado por PM2
- **Backend**: porta 3333, processo `thessara-api` no PM2
- **MySQL**: banco `thessara`, usuário `thessara`
- **Nginx**: reverse proxy para os frontends e API
- **URLs**:
  - Loja: `https://thessarasemijoias.com.br`
  - Admin: `https://admin.thessarasemijoias.com.br`
  - API: `https://api.thessarasemijoias.com.br`

### Build Commands

```bash
# Backend
npm --prefix backend run build

# Frontend-store (com variáveis de ambiente)
VITE_STORE_API_URL=/store VITE_SITE_URL=https://thessarasemijoias.com.br npm --prefix frontend-store run build

# Frontend-admin
VITE_API_URL=/admin VITE_STORE_PUBLIC_URL=https://thessarasemijoias.com.br npm --prefix frontend-admin run build

# Tudo
npm run build:all
```

### Dev Local

```bash
npm run dev                    # backend + admin
npm run dev:store              # frontend-store porta 5600
```

## Imagens

- **Hero home**: `frontend-store/public/images/home-hero.webp` (1365x768, landscape)
- **Hero home mobile**: `home-hero-mobile.webp` (768x1365, portrait)
- **Banner marca**: `brand-banner.webp` (1672x941, landscape)
- **Banner marca mobile**: `brand-banner-mobile.webp` (1254x1254, square)

Layout: grid split 1.15fr/0.85fr (desktop) → 1fr stack (mobile). Imagem nunca sobrepõe texto.

## Regras para IA

- **NUNCA commitar sem permissão explícita do usuário**
- **Sempre fazer build** após alterações no frontend (`npx vite build`)
- **Manter .gitignore limpo**: `node_modules/`, `dist/`, `*.log`, `backend/uploads/`, `.env`, `*.tar.gz`, `NUL`
- **Sempre verificar arquivos mortos** antes de commit (git ls-files para conferir trackeamento indevido)
- **Preferir Sass** existente em vez de Tailwind para estilos novos
- **Convenções**: componentes React funcionais, exports nomeados, CSS com BEM-like
- **Backend**: TypeScript, Prisma para queries, validação com Zod
- **Não adicionar comentários** a menos que solicitado
- **Usar memos e lazy loading** para performance (já configurado)
- **Imagens novas** devem ser `.webp`, salvas em `frontend-store/public/images/`
