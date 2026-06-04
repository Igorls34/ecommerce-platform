# Configuracao de Ambiente

## Backend

Copie `backend/.env.example` para `backend/.env` e preencha os valores reais.

### Obrigatorias

```env
DATABASE_URL=
JWT_SECRET=
PORT=3333
UPLOAD_PROVIDER=local
```

### Segurança

```env
ENCRYPTION_KEY=
```

Use uma chave hexadecimal de 64 caracteres para AES-256-GCM. Sem essa chave, o CPF nao sera persistido para evitar texto puro no banco.

Exemplo para gerar uma chave:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Pagamento Stripe

```env
PAYMENT_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_WEBHOOK_URL=http://localhost:3333/webhook/stripe
STRIPE_PIX_EXPIRES_AFTER_SECONDS=1800
```

Com `PAYMENT_PROVIDER=stripe`, o cartao continua na Stripe. O PIX atual usa fallback local com QR Code/copia-e-cola e nao confirma automaticamente.
Para producao, configure o webhook da Stripe para `payment_intent.succeeded`, `payment_intent.payment_failed` e `payment_intent.canceled`.
Para teste local de webhook Stripe, use `npm run stripe:listen` e copie o `whsec_...` exibido pela Stripe CLI para `STRIPE_WEBHOOK_SECRET`.

Observacao: a Stripe CLI apenas encaminha webhooks locais. Ela nao gera QR Code PIX. No fluxo atual, o QR Code/copia-e-cola do PIX vem do gerador local.

Futuro: para PIX Mercado Pago automatico, criar uma order em `/v1/orders` com `payment_method.id="pix"`, exibir `qr_code`/`qr_code_base64` retornados pela API e confirmar pagamento via webhook do Mercado Pago.

Cartao de credito/debito usa Stripe Elements no frontend. Para habilitar a tela de cartao, configure tambem:

```env
VITE_STRIPE_PUBLIC_KEY=pk_test_xxxxx
```

O backend nunca recebe numero do cartao, validade ou CVV.

### PIX local

```env
PIX_KEY=22644620783
PIX_MERCHANT_NAME=THESSARA
PIX_MERCHANT_CITY=SAO PAULO
```

Gera QR Code/copia-e-cola. Nao confirma pagamento automaticamente.

### Mailtrap

Modo recomendado:

```env
MAILTRAP_API_TOKEN=
MAIL_FROM=hello@demomailtrap.co
MAIL_FROM_NAME=Thessara
```

Fallback SMTP:

```env
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USER=
MAIL_PASS=
MAIL_SECURE=false
```

## Frontend Store

Copie `frontend-store/.env.example` para `frontend-store/.env`.

```env
VITE_STORE_API_URL=/store
VITE_PIX_KEY=22644620783
VITE_PIX_MERCHANT_NAME=THESSARA
VITE_PIX_MERCHANT_CITY=SAO PAULO
VITE_STRIPE_PUBLIC_KEY=pk_test_xxxxx
VITE_SITE_URL=https://thessarasemijoias.com.br
```

`VITE_SITE_URL` alimenta canonical, Open Graph, Twitter Card e JSON-LD.
