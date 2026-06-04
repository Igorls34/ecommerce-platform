# Payment providers

Camada de provedores de pagamento do backend.

## Fluxo atual

- `pix` usa `LocalPixPaymentProvider`.
- `pix` pode usar `MercadoPagoPixPaymentProvider` quando `PAYMENT_PIX_PROVIDER=mercado_pago`.
- `card` usa `StripeCardPaymentProvider`.
- `PaymentService` apenas valida o metodo, resolve o provedor no `PaymentProviderRegistry` e devolve a transacao para o fluxo de pedidos.

## Variaveis de ambiente

```env
PAYMENT_PIX_PROVIDER=local
PAYMENT_CARD_PROVIDER=stripe
MERCADO_PAGO_ACCESS_TOKEN=
MERCADO_PAGO_WEBHOOK_SECRET=
MERCADO_PAGO_NOTIFICATION_URL=https://api.thessarasemijoias.com.br/webhook/mercado-pago
MERCADO_PAGO_PIX_EXPIRATION_MINUTES=30
```

`PAYMENT_PROVIDER` ainda existe como compatibilidade legada, mas a escolha nova deve ser feita por metodo.

## Como adicionar outro provedor

1. Crie uma classe em `providers/` implementando `PaymentProvider`.
2. Defina `name` com o identificador usado no `.env`.
3. Defina `supportedMethods`, por exemplo `['pix']` ou `['card']`.
4. Implemente `createTransaction`.
5. Se o provedor permitir consulta ativa de status, implemente `getTransactionStatus`.
6. Registre a classe em `PaymentProviderRegistry`.
7. Aponte a variavel de ambiente do metodo para o novo provedor.

Exemplo:

```env
PAYMENT_PIX_PROVIDER=mercado_pago
```

## Mercado Pago Pix

O Mercado Pago usa o fluxo:

1. O pedido e criado no checkout.
2. `MercadoPagoPixPaymentProvider` cria um pagamento Pix em `/v1/payments`.
3. O backend salva `gatewayProvider=mercado_pago`, `gatewayOrderId`, `gatewayChargeId`, copia-e-cola e expiracao no pedido.
4. O frontend exibe QR Code/copia-e-cola.
5. O webhook `POST /webhook/mercado-pago` recebe a notificacao, valida `x-signature` quando `MERCADO_PAGO_WEBHOOK_SECRET` estiver configurado e consulta o pagamento na API antes de marcar o pedido como pago.

O pedido so deve ser marcado como pago por confirmacao confiavel do provedor, normalmente webhook combinado com consulta ativa na API do gateway.
