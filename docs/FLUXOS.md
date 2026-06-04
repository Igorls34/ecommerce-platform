# Fluxos Principais

## 1. Fluxo de Catalogo

1. Admin cria categoria/produto no painel.
2. Backend persiste dados via Prisma.
3. Loja publica carrega categorias em `/store/categories`.
4. Loja publica carrega produtos em `/store/products`.
5. Cliente navega por categoria, busca ou pagina de detalhe.

## 2. Fluxo de Carrinho

1. Cliente clica em adicionar produto.
2. `CartContext` chama utilitarios de `utils/cart.js`.
3. Carrinho e salvo em `localStorage`.
4. Quantidade e limitada pelo estoque conhecido.
5. A pagina de carrinho sincroniza estoque consultando o backend antes do checkout.

## 3. Fluxo de Checkout

1. Cliente preenche identificacao, CPF, telefone e endereco.
2. Zod valida CPF, CEP e campos obrigatorios.
3. Campo CEP consulta ViaCEP e preenche endereco.
4. Cliente escolhe metodo de pagamento.
5. Resumo calcula subtotal, frete, desconto PIX e total.
6. Frontend envia `POST /store/orders`.
7. Backend valida cliente, itens e estoque.
8. Backend cria pedido `PENDING` sem baixar estoque.
9. Backend cria PaymentIntent na Stripe:
   - PIX: retorna QR Code/copia-e-cola local
   - cartao: retorna `clientSecret` para Stripe Elements
   - local: retorna PIX local apenas em desenvolvimento quando `PAYMENT_PROVIDER=local`
10. Frontend redireciona para `/checkout/pagamento/:orderId`.

## 4. Fluxo de Pagamento PIX

1. Stripe retorna QR Code/copia-e-cola do PIX.
2. Tela de confirmacao exibe QR Code.
3. Tela de confirmacao consulta o pedido a cada 3 segundos.
4. Quando o webhook muda status para `PAID`, a tela limpa carrinho e mostra sucesso.
5. Quando o webhook muda status para `CANCELED`, a tela mostra falha/cancelamento.

## 5. Fluxo de Pagamento com Cartao

1. Cliente escolhe cartao no checkout.
2. Backend cria pedido `PENDING` e PaymentIntent `card` na Stripe.
3. Backend retorna `clientSecret`.
4. Tela `/checkout/pagamento/:orderId` renderiza Stripe Elements.
5. Cliente informa credito/debito diretamente no componente seguro da Stripe.
6. Frontend chama `stripe.confirmPayment`.
7. Webhook Stripe confirma `PAID` ou `CANCELED`.

Importante: numero do cartao, validade e CVV nunca passam pelo backend da loja.

## 6. Fluxo de Webhook Stripe

1. Stripe chama `POST /webhook/stripe`.
2. Rota usa `express.raw` antes do `express.json`, porque assinatura depende do body cru.
3. Backend valida a assinatura `stripe-signature` com `STRIPE_WEBHOOK_SECRET`.
4. Backend identifica `order_id` no `metadata` do PaymentIntent.
5. Backend mapeia status do gateway:
   - `payment_intent.succeeded` -> `PAID`
   - `payment_intent.payment_failed` e `payment_intent.canceled` -> `CANCELED`
6. Se `PAID`, backend abre transacao:
   - confere pedido atual
   - decrementa estoque com `stock >= quantity`
   - atualiza pedido para `PAID`
7. Retorna `200` para evitar reentrega desnecessaria do webhook.

## 7. Fluxo de E-mail

Status atual: preparado, mas desativado no checkout/pagamento ate confirmacao comercial.

1. `EmailService` tenta usar `MAILTRAP_API_TOKEN`.
2. Se nao houver token, tenta SMTP (`MAIL_HOST`, `MAIL_USER`, `MAIL_PASS`).
3. Se nao houver configuracao, registra log local.
4. Falha de e-mail nao derruba webhook nem pedido.

As chamadas no webhook estao comentadas em `backend/src/routes/payment/webhook.ts`.
No fluxo Stripe, mantenha a mesma decisao comercial antes de ativar e-mails em `backend/src/routes/payment/stripeWebhook.ts`.
Para reativar:

1. importar `EmailService`
2. instanciar `const emailService = new EmailService()`
3. restaurar `sendOrderConfirmation`
4. restaurar `sendPaymentFailed`

## 8. Fluxo de CPF

1. Frontend envia CPF ao checkout.
2. Backend usa CPF limpo para criar transacao no gateway.
3. Antes de persistir no `Customer`, backend chama `encryptCpf`.
4. Se `ENCRYPTION_KEY` existir, CPF e salvo com AES-256-GCM.
5. Se `ENCRYPTION_KEY` nao existir, CPF nao e salvo em texto puro.

## 9. SEO

1. `index.html` entrega metadados estaticos para crawlers.
2. `SEO.jsx` atualiza title, description, canonical, Open Graph, Twitter e JSON-LD por rota.
3. Rotas sensiveis como checkout, carrinho, conta e pedido sao marcadas como `noindex`.
4. `robots.txt` e `sitemap.xml` ficam em `frontend-store/public`.
