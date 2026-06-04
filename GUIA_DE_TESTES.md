# Guia de Testes

## 1. Objetivo da revisao

Validar se o e-commerce esta funcionando corretamente antes da entrega final. A revisao deve cobrir o fluxo de compra do cliente, checkout, login, carrinho, painel administrativo, pedidos, frete, pagamento quando configurado, responsividade e seguranca basica.

## 2. Como rodar o projeto

Clone o repositorio, entre na pasta `project/` e instale as dependencias:

```powershell
npm install
npm --prefix backend install
npm --prefix frontend-store install
npm --prefix frontend-admin install
```

Crie os arquivos de ambiente:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend-store\.env.example frontend-store\.env
Copy-Item frontend-admin\.env.example frontend-admin\.env
```

Preencha as variaveis obrigatorias, principalmente `DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_KEY`, dados de admin, frete e pagamento. Depois aplique as migracoes:

```powershell
npm --prefix backend run migrate:deploy
```

Rode os servicos em terminais separados:

```powershell
npm --prefix backend run dev
npm --prefix frontend-store run dev -- --host 0.0.0.0 --port 5600
npm --prefix frontend-admin run dev -- --host 0.0.0.0 --port 5500
```

URLs locais esperadas:

- Loja: `http://localhost:5600`
- Admin: `http://localhost:5500`
- API: `http://localhost:3333`

Comandos uteis de validacao:

```powershell
npm run build:all
npm test
npx playwright test
```

## 3. Checklist geral de teste

- [ ] Testar carregamento da pagina inicial
- [ ] Testar listagem de produtos
- [ ] Testar pagina de detalhes do produto
- [ ] Testar busca/filtros, se existirem
- [ ] Testar carrinho
- [ ] Testar alteracao de quantidade no carrinho
- [ ] Testar remocao de produtos do carrinho
- [ ] Testar cadastro de usuario
- [ ] Testar login
- [ ] Testar logout
- [ ] Testar recuperacao de sessao/token
- [ ] Testar checkout
- [ ] Testar preenchimento de endereco
- [ ] Testar calculo de frete, se existir
- [ ] Testar selecao de forma de entrega
- [ ] Testar criacao de pedido
- [ ] Testar fluxo de pagamento, se existir
- [ ] Testar feedback de pagamento aprovado
- [ ] Testar feedback de pagamento recusado/erro
- [ ] Testar historico de pedidos do cliente, se existir
- [ ] Testar painel administrativo
- [ ] Testar cadastro de produto no admin
- [ ] Testar edicao de produto
- [ ] Testar exclusao/desativacao de produto
- [ ] Testar controle de estoque
- [ ] Testar mudanca de status do pedido
- [ ] Testar responsividade no celular
- [ ] Testar responsividade no desktop
- [ ] Testar comportamento com internet lenta
- [ ] Testar mensagens de erro
- [ ] Testar protecao de rotas privadas
- [ ] Testar se usuario comum nao acessa area administrativa
- [ ] Testar se dados sensiveis nao aparecem no front-end
- [ ] Testar se o sistema nao quebra com campos vazios
- [ ] Testar se o sistema nao aceita valores invalidos
- [ ] Testar se o projeto roda apos clonar do GitHub

## 4. Testes de fluxo principal

### Fluxo A - Cliente comprando

1. Entrar no site da loja.
2. Visualizar produtos na pagina inicial e na listagem.
3. Abrir um produto.
4. Verificar nome, imagem, preco, descricao e estoque.
5. Adicionar o produto ao carrinho.
6. Ir para o carrinho.
7. Alterar quantidade e conferir subtotal/total.
8. Remover produto e adicionar novamente.
9. Fazer login ou cadastro.
10. Ir para o checkout.
11. Preencher dados pessoais e endereco.
12. Calcular frete.
13. Escolher forma de entrega.
14. Escolher pagamento disponivel.
15. Finalizar pedido.
16. Verificar mensagem de sucesso ou erro.
17. Conferir se o pedido aparece na area do cliente.
18. Conferir se o pedido aparece no admin.

### Fluxo B - Administrador gerenciando

1. Entrar como administrador.
2. Acessar o painel admin.
3. Criar um produto de teste.
4. Verificar se o produto aparece na loja.
5. Editar nome, preco, descricao, imagem e estoque.
6. Alterar estoque.
7. Simular pedido com esse produto.
8. Abrir pedido no admin.
9. Alterar status do pedido.
10. Testar fluxo de etiqueta/frete se as credenciais Melhor Envio estiverem configuradas.
11. Verificar se o cliente visualiza corretamente o pedido e o status.
12. Excluir ou desativar o produto de teste, se o fluxo permitir.

## 5. Pontos criticos para procurar bugs

- Erros no console do navegador.
- Erros no terminal.
- Requisicoes falhando na aba Network.
- Botoes sem acao.
- Formularios sem validacao.
- Campos obrigatorios permitindo envio vazio.
- Problemas de responsividade.
- Rotas quebradas.
- Imagens nao carregando.
- Dados duplicados.
- Valores de preco incorretos.
- Estoque negativo.
- Carrinho perdendo dados.
- Usuario deslogando indevidamente.
- Usuario sem permissao acessando area privada.
- Pedido sendo criado sem pagamento ou sem endereco.
- Falha no calculo de frete.
- Falha em integracao externa.
- Falta de feedback visual para o usuario.

## 6. Modelo de relatorio para preencher

# Relatorio de Testes

## Nome de quem testou:

## Data:

## Navegador usado:

## Dispositivo usado:

## Sistema operacional:

## Resumo geral:

Descreva se o sistema parece pronto ou nao.

## Bugs encontrados:

### Bug 1

- Tela:
- O que aconteceu:
- O que era esperado:
- Como reproduzir:
- Gravidade:
  - Baixa
  - Media
  - Alta
  - Critica
- Print ou video:

### Bug 2

- Tela:
- O que aconteceu:
- O que era esperado:
- Como reproduzir:
- Gravidade:
- Print ou video:

## Melhorias sugeridas:

Liste sugestoes de melhoria que nao sao bugs, mas podem melhorar a experiencia.

## Aprovacao final:

- [ ] Aprovado para entrega
- [ ] Aprovado com ajustes pequenos
- [ ] Precisa de correcoes importantes antes da entrega
- [ ] Nao aprovado

## 7. Criterios de aceite

O projeto so deve ser considerado pronto se:

- O fluxo principal de compra funcionar.
- O checkout funcionar sem erro critico.
- O pedido for registrado corretamente.
- O admin conseguir visualizar ou gerenciar pedidos/produtos, se essa funcionalidade existir.
- O site funcionar bem em celular e desktop.
- Nao houver erro critico no console.
- Nao houver dados sensiveis expostos.
- O projeto puder ser clonado e executado seguindo o README.
- As variaveis de ambiente estiverem documentadas.
- O `.gitignore` estiver correto.
- O repositorio no GitHub estiver organizado.
