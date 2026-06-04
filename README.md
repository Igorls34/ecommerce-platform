# Projeto Site Eliane

Monorepo de e-commerce para a marca Thessara, com loja para cliente final, painel administrativo, API propria, checkout, catalogo, pedidos, calculo de frete e integracoes externas em fase de validacao.

## Versão estável: `stable` — 04/06/2026

Tag `stable` aponta para a versão atual com todas as funcionalidades revisadas e operacionais.

## Status atual

Projeto em desenvolvimento, preparado para revisao externa e testes manuais antes da entrega final. O fluxo principal depende de banco MySQL, variaveis de ambiente e credenciais validas para integracoes como Stripe, Melhor Envio, Cloudinary e e-mail.

## Principais funcionalidades

- Loja React com pagina inicial, listagem de produtos, detalhes de produto, carrinho, checkout, acompanhamento de pedido, login/cadastro de cliente e area "Minha conta".
- Painel administrativo React com login protegido, dashboard, produtos, categorias, clientes, pedidos, leads de disponibilidade e fluxo operacional de frete/etiquetas.
- Backend Express com rotas separadas para loja (`/store`), admin (`/admin`) e webhook Stripe (`/webhook/stripe`).
- Persistencia com Prisma e MySQL.
- Autenticacao por JWT para admin e cliente.
- Upload local de imagens e suporte opcional a Cloudinary.
- Pagamento via Stripe para PIX/cartao quando configurado, com fallback PIX local para desenvolvimento.
- Calculo e operacoes de frete via Melhor Envio quando configurado.
- E-mails transacionais via Mailtrap/API SMTP quando configurado.
- Testes de backend, testes de admin com Vitest e testes E2E com Playwright.

## Tecnologias utilizadas

- Monorepo Node.js com npm.
- Front-end loja: React 18, Vite, React Router, React Hook Form, Zod, Sass/Tailwind, Stripe Elements.
- Front-end admin: React 18, Vite, React Router, Sass/Tailwind, Vitest e Testing Library.
- Back-end: Node.js, Express, TypeScript, Prisma, MySQL, JWT, bcryptjs, multer, sharp.
- Integracoes: Stripe, Melhor Envio, Cloudinary, Mailtrap/Nodemailer, Google Auth Library.
- Qualidade: ESLint, Prettier, Playwright.

## Estrutura de pastas

```text
project/
  backend/            API Express, Prisma, testes e servicos de integracao
  frontend-store/     Loja publica em React/Vite
  frontend-admin/     Painel administrativo em React/Vite
  docs/               Documentacao operacional e configuracao
  e2e/                Testes end-to-end Playwright
  scripts/            Scripts locais, compartilhamento e Stripe CLI
  deploy/             Arquivos auxiliares de deploy
```

## Instalacao

Execute os comandos a partir da pasta `project/`.

```powershell
npm install
npm --prefix backend install
npm --prefix frontend-store install
npm --prefix frontend-admin install
```

## Variaveis de ambiente

Crie os arquivos locais a partir dos exemplos:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend-store\.env.example frontend-store\.env
Copy-Item frontend-admin\.env.example frontend-admin\.env
```

Principais variaveis do backend:

- `DATABASE_URL`: conexao MySQL usada pelo Prisma.
- `JWT_SECRET`: segredo de assinatura dos tokens.
- `ENCRYPTION_KEY`: chave hexadecimal de 64 caracteres para dados sensiveis.
- `PORT`: porta da API, padrao `3333`.
- `ADMIN_EMAIL` e `ADMIN_PASSWORD`: usuario admin inicial.
- `PAYMENT_PROVIDER`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`: pagamento Stripe.
- `PIX_KEY`, `PIX_MERCHANT_NAME`, `PIX_MERCHANT_CITY`: fallback PIX local.
- `MELHOR_ENVIO_TOKEN`, `MELHOR_ENVIO_API_URL`, `STORE_ZIP_CODE`: frete.
- `UPLOAD_PROVIDER` e variaveis `CLOUDINARY_*`: upload de imagens.
- `MAILTRAP_API_TOKEN` ou variaveis SMTP `MAIL_*`: envio de e-mail.

Principais variaveis dos frontends:

- `frontend-store/.env`: `VITE_STORE_API_URL`, `VITE_STRIPE_PUBLIC_KEY`, `VITE_SITE_URL` e dados PIX publicos.
- `frontend-admin/.env`: `VITE_API_URL` e `VITE_STORE_PUBLIC_URL`.

Arquivos `.env` reais nao devem ser versionados. Use apenas os `.env.example` como referencia.

## Banco de dados

O backend usa Prisma com MySQL. Apos configurar `backend/.env`, gere o client e aplique as migracoes:

```powershell
npm --prefix backend run migrate:deploy
npm --prefix backend run build
```

Para carregar dados demonstrativos:

```powershell
npm --prefix backend run seed:demo
```

Para limpar os dados demo:

```powershell
npm --prefix backend run seed:demo:clear
```

## Como rodar localmente

Backend:

```powershell
npm --prefix backend run dev
```

Loja:

```powershell
npm --prefix frontend-store run dev -- --host 0.0.0.0 --port 5600
```

Admin:

```powershell
npm --prefix frontend-admin run dev -- --host 0.0.0.0 --port 5500
```

Atalho local existente:

```powershell
npm run dev
```

Observacao: no estado atual, `npm run dev` inicia backend e admin. Para testar a loja, rode tambem o comando da loja acima ou use `npm run dev:store`.

## Build e testes

Build completo:

```powershell
npm run build:all
```

Builds separados:

```powershell
npm --prefix backend run build
npm --prefix frontend-store run build
npm --prefix frontend-admin run build
```

Testes:

```powershell
npm test
npm --prefix backend test
npm --prefix frontend-admin test
npx playwright test
```

Em Windows, se o Prisma falhar no build com erro de arquivo travado, encerre processos Node/editores que possam estar usando o Prisma e tente novamente.

## Observacoes para revisao

- Nao commitir `.env`, uploads locais, logs, `node_modules`, builds ou caches.
- Pagamento real depende de Stripe configurado e webhook validado.
- Sem `STRIPE_SECRET_KEY`, o checkout PIX pode usar fallback local apenas para desenvolvimento; isso nao confirma pagamento real.
- Frete depende de token Melhor Envio e consistencia entre ambiente sandbox/producao.
- Uploads em `backend/uploads/` sao locais e nao sao versionados.
- Login com Google aparece como dependencia, mas a rota esta comentada/desativada no fluxo atual.
- Consulte `docs/README.md` para o indice completo da documentacao.
- Revise `docs/CONFIGURACAO.md`, `docs/OPERACAO.md`, `docs/STRIPE_CLI.md` e `GUIA_DE_TESTES.md` antes dos testes.

## Proximos passos recomendados

- Validar o projeto clonado em uma maquina limpa seguindo este README.
- Rodar migracoes, seed demo, builds e testes automatizados.
- Testar manualmente o fluxo de compra, checkout, pagamento, carrinho, login, admin, pedidos, frete e responsividade.
- Confirmar configuracao final de Stripe, Melhor Envio, e-mail e Cloudinary antes de producao.
- Revisar permissoes e exposicao de dados sensiveis no front-end e nas respostas da API.
