# Stripe CLI Local

Use a Stripe CLI para receber webhooks da Stripe no backend local.

## 1. Instalar

No Windows:

```powershell
winget install --id Stripe.StripeCLI
```

Feche e abra o terminal depois da instalacao. Confirme:

```powershell
npm run stripe:version
```

## 2. Login

```powershell
npm run stripe:login
```

O navegador abre para autenticar na conta Stripe.

## 3. Subir Backend

Em um terminal:

```powershell
npm --prefix backend run dev
```

## 4. Ouvir Webhooks

Em outro terminal:

```powershell
npm run stripe:listen
```

Por padrao, o script encaminha eventos para:

```text
http://localhost:3333/webhook/stripe
```

A Stripe CLI exibira um segredo parecido com:

```text
whsec_xxxxxxxxx
```

Copie esse valor para `backend/.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxx
```

Depois reinicie o backend.

## 5. Testar Evento

Com o listener rodando:

```powershell
npm run stripe:trigger:paid
```

Esse comando dispara um `payment_intent.succeeded` generico. Para confirmar pedido real do checkout, o evento precisa ter `metadata.order_id`, que e criado automaticamente quando o cliente gera o pedido pela loja.

## 6. Porta Diferente

Se o backend estiver em outra porta:

```powershell
$env:STRIPE_FORWARD_TO="localhost:4000/webhook/stripe"
npm run stripe:listen
```
