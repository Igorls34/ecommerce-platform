# Arquitetura do Projeto

Este documento descreve o estado atual do projeto para facilitar manutencao futura.

## Visao Geral

O sistema esta dividido em tres partes principais:

- `backend`: API Node.js + Express + TypeScript + Prisma.
- `frontend-admin`: painel administrativo React + Vite.
- `frontend-store`: loja publica React + Vite.

O backend concentra regras de negocio, persistencia, upload, checkout, gateway de pagamento e webhooks. Os frontends consomem a API e mantem apenas estado de interface.

## Backend

### Responsabilidades

- Autenticacao administrativa via JWT.
- Login/captacao de cliente da loja.
- CRUD administrativo de categorias e produtos.
- Catalogo publico da loja.
- Criacao de pedidos.
- Integracao de pagamento Stripe com Pix.
- Webhook de confirmacao de pagamento.
- Envio de e-mail via Mailtrap/Nodemailer.
- Criptografia de CPF antes de persistir no banco.

### Pastas Importantes

- `src/controllers/`: entrada HTTP e orquestracao dos casos de uso.
- `src/routes/`: agrupamento das rotas Express (admin, store, webhook).
- `src/services/`: integracoes e regras auxiliares (Pagamento, Email, Frete, Imagem).
- `src/lib/`: clientes compartilhados (Prisma, criptografia, Stripe).
- `src/middlewares/`: autenticacao JWT e upload multer.
- `tests/`: testes de integracao do backend.

## Frontend Store

### Responsabilidades

- Vitrine publica da loja.
- Listagem e filtro por categorias.
- Pagina de produto.
- Carrinho local persistido no `localStorage`.
- Checkout com validacao via React Hook Form + Zod.
- Geracao visual de QR Code PIX local enquanto o pedido ainda nao foi enviado.
- Tela de confirmacao com QR Code retornado pelo backend/gateway.
- Polling do status do pedido.
- SEO tecnico por rota.

### Pastas Importantes

- `src/pages`: paginas roteadas.
- `src/components`: componentes reutilizaveis.
- `src/components/checkout`: estrutura modular do checkout.
- `src/state`: contextos de carrinho e cliente.
- `src/services`: cliente HTTP da loja.
- `src/styles`: CSS global da experiencia publica.

## Frontend Admin

### Responsabilidades

- Login do administrador.
- Dashboard.
- Produtos, categorias, clientes e avisos.
- Upload e manutencao do catalogo.

## Modelo de Dados

O Prisma define:

- `AdminUser`
- `Customer`
- `PasswordResetToken`
- `Category`
- `Product`
- `ProductImage`
- `ProductVariant`
- `ProductAvailabilityLead`
- `Order`
- `OrderItem`
- `OrderEvent`
- `FiscalDocument`
- `ReverseLogisticsRequest`
- `MelhorEnvioTokenState`
- `MelhorEnvioTokenEvent`

Todos os campos de gateway (`gatewayProvider`, `paymentMethod`, `gatewayOrderId`, `gatewayChargeId`, `paymentReference`, `paymentStatusDetail`, `paymentExpiresAt`, `expiredAt`, `checkoutAttemptId`, `paidAt`) ja estao migrados e disponiveis no schema desde a migration `20260424014500_add_gateway_fields_to_order`.

## Principio Atual do Checkout

O pedido e criado como `PENDING`, mas o estoque nao e baixado nesse momento. A baixa de estoque acontece somente quando o webhook do gateway confirma pagamento `PAID`.

Isso evita perda de estoque quando o cliente abandona o PIX, fecha o navegador ou tem pagamento recusado.
