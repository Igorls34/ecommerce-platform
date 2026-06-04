# Operacao e Testes

## Instalar Dependencias

```powershell
npm install
npm --prefix backend install
npm --prefix frontend-admin install
npm --prefix frontend-store install
```

## Rodar Backend

```powershell
npm --prefix backend run dev
```

## Rodar Loja

```powershell
npm --prefix frontend-store run dev -- --host 0.0.0.0 --port 5600
```

## Rodar Admin

```powershell
npm --prefix frontend-admin run dev -- --host 0.0.0.0 --port 5500
```

## Compartilhamento Local

```powershell
npm run share
```

Esse comando inicia backend, admin, loja, proxy, ngrok, painel local e Stripe CLI. A Stripe CLI encaminha webhooks para:

```text
http://localhost:3333/webhook/stripe
```

Logs da Stripe CLI:

```text
share-runtime/stripe.out.log
share-runtime/stripe.err.log
```

Se a Stripe CLI gerar um novo `whsec_...`, copie para `STRIPE_WEBHOOK_SECRET` em `backend/.env` e reinicie o backend.

Para encerrar tudo:

```powershell
npm run share:stop
```

## Testes

Backend:

```powershell
npm --prefix backend test
```

Build da loja:

```powershell
npm --prefix frontend-store run build
```

E2E Playwright:

```powershell
npx playwright test
```

## Teste Manual do Gateway

1. Configure `PAYMENT_PROVIDER=stripe` e `STRIPE_SECRET_KEY` no `backend/.env`.
2. Para teste local, rode `npm run stripe:listen` e copie o `whsec_...` para `STRIPE_WEBHOOK_SECRET`.
3. Em producao, configure webhook no dashboard Stripe apontando para `/webhook/stripe`.
4. Inicie backend e loja.
5. Crie pedido PIX pelo checkout.
6. Confirme que a tela de pedido mostra QR Code do gateway.
7. Simule ou realize pagamento sandbox.
8. Verifique se webhook muda pedido para `PAID`.
9. Confirme que estoque so baixou apos `PAID`.
10. Se a funcionalidade de e-mail for reativada, confirme o envio pelo Mailtrap.

Detalhes do fluxo local com Stripe CLI estao em `docs/STRIPE_CLI.md`.

## Observacao Sobre Build do Backend no Windows

O comando `npm --prefix backend run build` executa `prisma generate` antes do `tsc`. Em algumas execucoes no Windows, o Prisma falha com `EPERM` ao renomear `query_engine-windows.dll.node`, normalmente por arquivo travado por processo/antivirus/editor.

Quando isso acontecer, validar TypeScript separadamente:

```powershell
cd backend
npx tsc
```

Depois encerre processos Node que estejam usando Prisma e tente o build completo novamente.
