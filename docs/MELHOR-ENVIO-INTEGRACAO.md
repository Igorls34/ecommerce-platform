# Integracao Melhor Envio

Documento de referencia interna sobre o estado atual da integracao Melhor Envio.

## Escopo Implementado

- Cotacao de frete no checkout via `POST /api/v2/me/shipment/calculate`.
- Validacao do frete escolhido antes de criar o pedido.
- Persistencia do servico escolhido no pedido (`melhorEnvioServiceId`) e do resumo da opcao em `shippingAddress.shippingOption`.
- Criacao de envio no carrinho via `POST /api/v2/me/cart`.
- Checkout/pagamento da etiqueta via `POST /api/v2/me/shipment/checkout`.
- Geracao de etiqueta via `POST /api/v2/me/shipment/generate`.
- Espera ativa configuravel antes de liberar impressao, pois a geracao e assincrona.
- Impressao publica via `POST /api/v2/me/shipment/print` com `mode: public`.
- Pre-visualizacao via `POST /api/v2/me/shipment/preview`.
- Consulta de rastreio via `POST /api/v2/me/shipment/tracking` e `GET /api/v2/me/orders/search`.
- Consulta de saldo via `GET /api/v2/me/balance`.
- Consulta da conta conectada via `GET /api/v2/me`.
- Renovacao automatica de access token com `refresh_token`.
- Arquivamento local das etiquetas liberadas para impressao.
- Base preparada para logistica reversa via `POST /api/v2/me/cart/reverse`, ainda sem endpoint ativo.

## Configuracoes

Variaveis principais:

```env
MELHOR_ENVIO_API_URL=
MELHOR_ENVIO_TOKEN=
MELHOR_ENVIO_REFRESH_TOKEN=
MELHOR_ENVIO_CLIENT_ID=
MELHOR_ENVIO_CLIENT_SECRET=
MELHOR_ENVIO_REDIRECT_URI=
MELHOR_ENVIO_OAUTH_URL=
MELHOR_ENVIO_USER_AGENT=
MELHOR_ENVIO_DEFAULT_SERVICE_ID=
MELHOR_ENVIO_REFRESH_CHECK_INTERVAL_MS=
MELHOR_ENVIO_LABEL_READY_ATTEMPTS=8
MELHOR_ENVIO_LABEL_READY_INTERVAL_MS=3000
```

O `User-Agent` e obrigatorio pela API e deve identificar a aplicacao com e-mail de suporte.

## Fluxo de Frete

O sistema usa um pacote padrao configurado por ambiente:

```env
STORE_WEIGHT=0.5
STORE_LENGTH=20
STORE_WIDTH=15
STORE_HEIGHT=10
```

O valor segurado enviado ao Melhor Envio usa o valor real dos produtos no pacote, calculado por:

```txt
soma(preco do produto * quantidade)
```

No checkout, o frontend envia esse valor na cotacao. Na criacao do pedido, o backend recalcula o subtotal pelo banco antes de validar novamente o frete, evitando confiar apenas no cliente.

## Fluxo de Etiqueta

1. Pedido precisa estar pago/pronto para envio.
2. Backend cria o envio no carrinho do Melhor Envio.
3. Backend solicita checkout/pagamento da etiqueta.
4. Backend solicita geracao da etiqueta.
5. Backend consulta a impressao publica em tentativas configuraveis ate o Melhor Envio retornar uma URL/PDF.
6. Backend salva `melhorEnvioLabelUrl` somente quando a URL de impressao existir.
7. Botao de impressao no admin fica disponivel apenas apos `melhorEnvioLabelUrl` ser salvo.
8. Admin abre a URL publica do Melhor Envio para visualizar/imprimir a etiqueta.

Se a geracao for aceita, mas a API ainda nao retornar a URL de impressao dentro do limite configurado,
o pedido fica com status interno `generated_waiting_print`. Nesse caso, o admin pode acionar novamente
`Liberar impressao` para repetir a consulta ao endpoint de impressao.

## Tratamento de Erros

Principais status tratados:

- `401`: tenta renovar token uma vez e repetir a chamada.
- `403`: indica conflito de ambiente/permissao.
- `402`: indica problema de saldo ou pagamento da etiqueta.
- `400`/`422`: mostra mensagens de validacao retornadas pela API.
- demais erros: retornam erro generico de API do Melhor Envio.

Eventos de renovacao de token sao registrados no banco, aparecem nos alertas do admin e disparam e-mail administrativo.

## Confronto com a Documentacao

Pontos revisados na documentacao oficial:

- Autenticacao OAuth2: access token valido por 30 dias e refresh token por 45 dias.
- Headers obrigatorios: `Accept`, `Content-Type`, `Authorization` e `User-Agent`.
- Cotacao de fretes: `POST /api/v2/me/shipment/calculate`.
- Compra de fretes: inserir no carrinho com os dados completos do envio.
- Geracao e impressao: checkout antes de gerar/imprimir, geracao assincrona e recomendacao de delay.
- Pre-visualizacao: link exige sessao ativa do Melhor Envio.
- Impressao publica: pode ser acessada externamente sem sessao ativa.
- Saldo: `GET /api/v2/me/balance`.
- Pesquisa de etiqueta: `GET /api/v2/me/orders/search`.
- Listagem de etiquetas: `GET /api/v2/me/orders`.
- Cancelamento de etiquetas: `POST /api/v2/me/shipment/cancel`.
- Logistica reversa: `POST /api/v2/me/cart/reverse`.
- Webhooks: disponiveis para atualizacoes do ciclo de vida da etiqueta, ainda nao implementados neste sistema.

## Observacao Tecnica

Ate o momento, a analise chegou tambem aos recursos de pesquisa, listagem e cancelamento de etiquetas. Esses recursos parecem suficientes e interessantes para consolidar os fluxos desejados de acompanhamento, operacao e manutencao das etiquetas. No estado atual, pesquisa ja e usada como apoio para rastreio; listagem e cancelamento foram apenas avaliados na documentacao e permanecem como proximos passos possiveis.

## Fontes Oficiais Consultadas

- https://docs.melhorenvio.com.br/reference
- https://docs.melhorenvio.com.br/docs/cotacao-de-fretes
- https://docs.melhorenvio.com.br/reference/calculo-de-fretes-por-produtos
- https://docs.melhorenvio.com.br/docs/compra-de-fretes
- https://docs.melhorenvio.com.br/reference/inserir-fretes-no-carrinho
- https://docs.melhorenvio.com.br/docs/geracao-e-impressao-de-etiquetas-de-envio
- https://docs.melhorenvio.com.br/reference/geracao-de-etiquetas
- https://docs.melhorenvio.com.br/reference/impressao-de-etiquetas
- https://docs.melhorenvio.com.br/reference/pre-visualizacao-de-etiquetas
- https://docs.melhorenvio.com.br/reference/saldo-do-usuario
- https://docs.melhorenvio.com.br/reference/pesquisar-etiqueta
- https://docs.melhorenvio.com.br/reference/listar-etiquetas
- https://docs.melhorenvio.com.br/reference/cancelamento-de-etiquetas
- https://docs.melhorenvio.com.br/reference/inserir-logistica-reversa-no-carrinho
- https://docs.melhorenvio.com.br/docs/webhooks
