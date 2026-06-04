# Analise de Hospedagem - Hostinger VPS KVM 1

## Resumo Executivo

Classificacao: **B) KVM 1 e possivel, mas exige ajustes.**

A VPS Hostinger KVM 1, com **1 vCPU, 4 GB RAM e 50 GB NVMe**, consegue hospedar este projeto inicialmente se o trafego for baixo/moderado e se producao for configurada com disciplina: Nginx servindo os frontends estaticos, backend Node em 1 processo, MySQL tunado, swap, logs rotacionados e builds preferencialmente fora da VPS.

O projeto ja esta bem separado em `backend`, `frontend-store`, `frontend-admin` e `deploy/vps`. Ha suporte real para VPS com `nginx.conf`, `ecosystem.config.cjs`, Prisma migrations e scripts de build/start. Os maiores pontos de atencao sao: **CORS aberto**, **admin JWT nao valida role/admin no middleware**, builds pesados para 1 vCPU, imagens grandes no storefront e banco junto da aplicacao.

## Estrutura Geral do Projeto

Pastas principais:

- `backend/`: API Express + TypeScript + Prisma + integracoes Stripe, Melhor Envio, e-mail e upload.
- `frontend-store/`: loja publica React/Vite.
- `frontend-admin/`: painel administrativo React/Vite.
- `deploy/vps/`: exemplos de deploy com Nginx, PM2 e variaveis de ambiente.
- `docs/`: documentacao operacional.
- `e2e/`: testes end-to-end Playwright.
- `scripts/`: scripts locais, compartilhamento e Stripe CLI.

Scripts relevantes:

- Raiz:
  - `dev`
  - `dev:store`
  - `build:store`
  - `build:admin`
  - `build:backend`
  - `build:all`
  - `test`
  - `test:browser`
- Backend:
  - `dev`
  - `build`
  - `start`
  - `start:prod`
  - `migrate:deploy`
  - `seed:demo`
  - `seed:demo:clear`
  - `test`
- Frontend store:
  - `dev`
  - `build`
  - `preview`
- Frontend admin:
  - `dev`
  - `build`
  - `preview`
  - `test`

Arquivos relevantes encontrados:

- `backend/package.json`
- `backend/tsconfig.json`
- `backend/.env.example`
- `backend/prisma/schema.prisma`
- `frontend-store/package.json`
- `frontend-store/vite.config.js`
- `frontend-store/.env.example`
- `frontend-admin/package.json`
- `frontend-admin/vite.config.js`
- `frontend-admin/.env.example`
- `deploy/vps/nginx.conf`
- `deploy/vps/ecosystem.config.cjs`
- `deploy/vps/backend.env.example`
- `deploy/vps/README.md`

Nao foram encontrados `Dockerfile` ou `docker-compose` ativos para producao. Para KVM 1, isso e positivo, pois instalar direto no Ubuntu reduz overhead e complexidade inicial.

## Backend Node/Express

O backend esta em `backend/` e usa Express com TypeScript.

Pontos verificados:

- Porta padrao: `3333`.
- Porta configuravel via `PORT`.
- Entrada de producao: `node dist/server.js`.
- Build: `npm --prefix backend run build`.
- Start: `npm --prefix backend run start` ou PM2 apontando para `dist/server.js`.
- `NODE_ENV=production` e considerado.
- Em producao, o backend aborta se `JWT_SECRET` nao estiver definido.

Rotas principais:

- `/store`: loja publica, autenticacao cliente, catalogo, pedidos, pagamento, frete e rastreio.
- `/admin`: painel administrativo, produtos, categorias, clientes, pedidos, Melhor Envio, fiscal placeholder e etiquetas.
- `/webhook/stripe`: webhook Stripe.
- `/uploads`: arquivos de upload local.

Pontos positivos:

- Rotas bem separadas entre loja, admin e webhook.
- Stripe webhook usa `express.raw({ type: 'application/json' })` antes de `express.json()`, correto para verificacao de assinatura.
- Em producao, webhook Stripe exige `STRIPE_WEBHOOK_SECRET`.
- Services isolam integracoes com Stripe, Melhor Envio, e-mail, upload e pagamentos.
- Tratamento de erros existe em controllers e services.
- Upload limita imagem a 5 MB e converte para WebP com `sharp`.
- PM2 ja esta previsto em `deploy/vps/ecosystem.config.cjs`.

Pontos de atencao:

- `app.use(cors())` esta aberto para qualquer origem. Em producao, deve restringir para `https://thessarasemijoias.com.br` e `https://admin.thessarasemijoias.com.br`.
- `authenticateAdmin` apenas valida assinatura JWT; nao valida `role=admin` nem consulta se o token pertence a um admin. Como cliente e admin usam o mesmo `JWT_SECRET`, isso deve ser corrigido antes de producao real.
- Ha logs com `console.log` e `console.error`; sao aceitaveis no inicio, mas precisam de rotacao para nao consumir disco.
- Upload local funciona, mas exige backup. Para KVM 1, Cloudinary e melhor para reduzir disco e risco operacional.
- `deploy/vps/backend.env.example` precisa refletir todas as variaveis atuais do Melhor Envio/OAuth/refresh/arquivo de etiquetas.

## Banco de Dados e Prisma

O projeto usa Prisma com MySQL:

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

Isso e compativel com MySQL ou MariaDB na propria VPS.

Modelos principais:

- `AdminUser`
- `Customer`
- `PasswordResetToken`
- `Category`
- `Product`
- `ProductImage`
- `ProductAvailabilityLead`
- `Order`
- `OrderItem`
- `OrderEvent`
- `FiscalDocument`
- `ReverseLogisticsRequest`
- `MelhorEnvioTokenState`
- `MelhorEnvioTokenEvent`

Migrations:

O projeto possui migrations versionadas em `backend/prisma/migrations`, incluindo criacao inicial, clientes, pedidos, produtos, gateway, frete, Melhor Envio, fiscal, logistica reversa e arquivamento de etiquetas.

Seeds:

- `seed:demo`
- `seed:demo:clear`

Indices relevantes existentes:

- `Customer.email` unico.
- `Customer.googleId` unico.
- `Customer.cpf` unico.
- `PasswordResetToken.tokenHash` unico.
- `Order.trackingToken` unico.
- `Order.customerId/status`.
- `Order.paymentExpiresAt`.
- `OrderEvent.orderId/createdAt`.
- Indices em documentos fiscais, logistica reversa e eventos do Melhor Envio.

Pontos de atencao:

- Listagens de produtos e clientes ainda podem retornar tudo sem paginacao.
- Dashboard possui consultas que crescem mal, especialmente algumas buscas sem janela de tempo ampla.
- Catalogo com poucos produtos funciona bem, mas muitos produtos/imagens exigirao paginacao.
- Banco na propria VPS e viavel no inicio, mas banco externo e melhor se houver trafego maior, alta disponibilidade ou necessidade de backup gerenciado.
- 50 GB NVMe sao suficientes inicialmente, mas backups, uploads, logs e etiquetas podem consumir espaco rapidamente.

## Frontend Loja

Framework:

- React 18.
- Vite.
- React Router.
- React Hook Form.
- Zod.
- Stripe Elements.
- Sass/Tailwind.

Deploy:

- Pode ser buildado como arquivos estaticos com `npm --prefix frontend-store run build`.
- Pode ser servido pelo Nginx em `thessarasemijoias.com.br`.

Variaveis:

```env
VITE_STORE_API_URL=https://api.thessarasemijoias.com.br/store
VITE_STRIPE_PUBLIC_KEY=pk_...
VITE_SITE_URL=https://thessarasemijoias.com.br
```

Pontos positivos:

- API vem de variavel `VITE_STORE_API_URL`.
- Build final e estatico.
- Nginx com `try_files $uri $uri/ /index.html` funciona para SPA.
- SEO basico existe via componente de SEO.
- Checkout usa Stripe Elements para cartao e pode consumir Pix Stripe retornado pelo backend.

Pontos de atencao:

- Existem imagens grandes em `frontend-store/src/images`: aproximadamente **258 MB** no total.
- Ha arquivos individuais entre **7 MB e 17 MB**, muito pesados para e-commerce.
- Isso aumenta tempo de build, deploy, trafego e prejudica performance/SEO.
- Existem dependencias externas de imagem/icone, como Unsplash/Iconify.
- `vite.config.js` contem proxy local apenas para desenvolvimento, sem impacto direto no build.

## Frontend Admin

Framework:

- React 18.
- Vite.
- React Router.
- Vitest.
- Sass/Tailwind.

Deploy:

- Pode ser buildado como arquivos estaticos com `npm --prefix frontend-admin run build`.
- Pode ser servido pelo Nginx em `admin.thessarasemijoias.com.br`.

Variaveis:

```env
VITE_API_URL=https://api.thessarasemijoias.com.br/admin
VITE_STORE_PUBLIC_URL=https://thessarasemijoias.com.br
```

Pontos positivos:

- API vem de variavel `VITE_API_URL`.
- Admin pode ser servido em subdominio separado.
- Frontend redireciona para login quando recebe 401.
- Rotas admin no backend usam middleware de autenticacao.

Pontos de atencao:

- Ha arquivos legados com `localhost` em `frontend-admin/src/pages/index.js` e `frontend-admin/src/pages/novo-produto.js`. Se nao forem usados no build atual, nao impactam, mas devem ser removidos ou isolados para evitar confusao.
- A protecao definitiva precisa ser corrigida no backend, validando token admin/role admin.

## Estimativa de Recursos na KVM 1

Uso normal aproximado:

- Nginx: 20-80 MB RAM.
- Backend Node/Express: 120-300 MB RAM.
- PM2: 50-100 MB RAM.
- MySQL/MariaDB tunado: 400 MB a 1.2 GB RAM.
- Sistema Ubuntu: 400-800 MB RAM.

Total normal esperado:

```text
1.2 GB a 2.5 GB RAM
```

Durante build:

- Backend TypeScript + Prisma: consumo moderado.
- Vite store/admin: pode consumir 700 MB a 1.5 GB ou mais.
- Imagens grandes podem aumentar tempo de build e uso de disco.
- Em 1 vCPU, builds podem deixar a aplicacao lenta se feitos em horario de uso.

Durante migrations:

- Migrations atuais devem ser leves.
- Risco cresce quando houver tabelas grandes e migrations alterando muitas linhas.

Picos simples:

- 1 vCPU aguenta operacao inicial, mas e sensivel a:
  - uploads com `sharp`;
  - builds concorrendo com producao;
  - dashboard admin;
  - consultas sem paginacao;
  - MySQL e Node disputando CPU.

Armazenamento:

- 50 GB NVMe e suficiente inicialmente.
- Riscos principais:
  - backups acumulados;
  - logs PM2/Nginx;
  - uploads locais;
  - etiquetas arquivadas;
  - imagens grandes;
  - node_modules e builds antigos.

## Possibilidade Real de Usar KVM 1

Da para usar KVM 1 inicialmente?

Sim, para lancamento inicial, baixo trafego e operacao controlada.

Da para usar KVM 1 em producao real?

Sim, desde que os ajustes obrigatorios sejam feitos e haja monitoramento. Nao e a configuracao ideal para crescimento, mas e aceitavel para inicio.

Condicoes necessarias:

- Nginx servindo frontends estaticos.
- Backend em 1 processo.
- MySQL/MariaDB tunado.
- Swap configurado.
- CORS restrito.
- Admin auth corrigida.
- SSL ativo.
- Firewall ativo.
- Backups automatizados.
- Logs rotacionados.
- Builds preferencialmente fora da VPS.

O que pode tornar KVM 1 inviavel:

- Muitos acessos simultaneos.
- Campanhas de trafego.
- Muitos produtos/imagens grandes.
- Uploads frequentes.
- Builds feitos em producao durante horario de uso.
- Dashboard pesado com banco grande.
- Banco e aplicacao competindo por CPU/RAM.

Banco na propria VPS ou externo?

- Inicialmente, pode ficar na propria VPS.
- Para maior seguranca, backup e escala, banco externo e melhor.
- Se o projeto comecar a ter vendas reais constantes, considerar banco gerenciado ou VPS maior.

Builds na VPS ou fora?

- Preferir builds fora da VPS: localmente, GitHub Actions ou outro CI.
- Na KVM 1, buildar na VPS e possivel, mas deve ser feito em horario de baixo uso.

Docker ou instalacao direta?

- Para KVM 1, melhor instalar direto no Ubuntu no inicio.
- Docker aumenta isolamento, mas consome mais RAM/disco e adiciona complexidade.

PM2 ou systemd?

- PM2 e adequado para este projeto, especialmente porque ja existe `ecosystem.config.cjs`.
- `systemd` tambem e bom, mas PM2 facilita reload, logs e restart por memoria.

Servicos que nao deveriam rodar nessa VPS:

- CI/build pesado recorrente.
- Observabilidade pesada.
- Filas/workers pesados.
- Servidor de e-mail proprio.
- Banco de analytics.
- Storage de muitas imagens sem estrategia de limpeza/backup.

## Otimizacoes Necessarias

### Prioridade Alta

- Restringir CORS para os dominios de producao.
- Corrigir autenticacao admin para exigir role/admin ou consulta ao `AdminUser`.
- Criar swap de 2 GB ou 4 GB.
- Rodar backend atras do Nginx, sem expor porta `3333`.
- Configurar SSL com Certbot.
- Configurar firewall permitindo apenas SSH, HTTP e HTTPS.
- Configurar webhook Stripe em `https://api.thessarasemijoias.com.br/webhook/stripe`.
- Configurar backup diario do banco.
- Configurar backup de uploads/etiquetas se ficarem locais.
- Configurar rotacao de logs.
- Limitar memoria do PM2 com `max_memory_restart`.
- Tunear MySQL/MariaDB para 4 GB RAM.
- Revisar `.env` real e nao versionar secrets.
- Atualizar `deploy/vps/backend.env.example` com todas as variaveis atuais.

### Prioridade Media

- Buildar frontends fora da VPS.
- Compactar imagens grandes do storefront.
- Usar Cloudinary para imagens de produto.
- Paginar produtos, clientes e catalogo.
- Ajustar dashboard para janelas de tempo e agregacoes mais baratas.
- Criar endpoint `/health`.
- Monitorar CPU, RAM, disco e logs.
- Configurar cache basico no Nginx para assets estaticos.

### Prioridade Baixa

- CDN para assets.
- Banco externo gerenciado.
- Worker separado para tarefas pesadas.
- Observabilidade mais completa.
- Deploy automatizado via CI/CD.
- Melhorar estrategia de imagens responsivas.

## Checklist de Deploy Recomendado

1. Preparar Ubuntu.
2. Criar usuario deploy sem root.
3. Instalar Node.js LTS 20 ou 22.
4. Instalar Nginx.
5. Instalar MySQL ou MariaDB.
6. Instalar PM2.
7. Criar swap.
8. Configurar firewall.
9. Criar banco e usuario MySQL.
10. Clonar repositorio.
11. Configurar `backend/.env` real.
12. Configurar `.env` da loja.
13. Configurar `.env` do admin.
14. Rodar `npm --prefix backend install`.
15. Rodar `npm --prefix backend run build`.
16. Rodar `npm --prefix backend run migrate:deploy`.
17. Rodar `npm --prefix frontend-store install`.
18. Buildar store com `VITE_STORE_API_URL=https://api.thessarasemijoias.com.br/store`.
19. Rodar `npm --prefix frontend-admin install`.
20. Buildar admin com `VITE_API_URL=https://api.thessarasemijoias.com.br/admin`.
21. Configurar Nginx para `thessarasemijoias.com.br`.
22. Configurar Nginx para `admin.thessarasemijoias.com.br`.
23. Configurar Nginx para `api.thessarasemijoias.com.br`.
24. Testar Nginx com `nginx -t`.
25. Ativar SSL com Certbot.
26. Subir backend com PM2.
27. Rodar `pm2 save`.
28. Configurar startup do PM2.
29. Configurar webhook Stripe no dashboard da Stripe.
30. Testar checkout com Pix.
31. Testar checkout com cartao.
32. Testar webhook Stripe.
33. Testar painel admin.
34. Testar pedido.
35. Testar calculo de frete.
36. Testar Melhor Envio.
37. Testar geracao/preview/impressao de etiqueta.
38. Testar logs.
39. Testar backup.
40. Testar restore basico do banco.

## Exemplos de Comandos

Criar swap:

```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Instalar base:

```bash
sudo apt update
sudo apt install -y nginx mysql-server certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

Build backend:

```bash
npm --prefix backend install
npm --prefix backend run build
npm --prefix backend run migrate:deploy
```

Build loja:

```bash
VITE_STORE_API_URL=https://api.thessarasemijoias.com.br/store npm --prefix frontend-store run build
```

Build admin:

```bash
VITE_API_URL=https://api.thessarasemijoias.com.br/admin VITE_STORE_PUBLIC_URL=https://thessarasemijoias.com.br npm --prefix frontend-admin run build
```

PM2:

```bash
pm2 start deploy/vps/ecosystem.config.cjs
pm2 save
pm2 startup
```

Certbot:

```bash
sudo certbot --nginx -d thessarasemijoias.com.br -d www.thessarasemijoias.com.br -d admin.thessarasemijoias.com.br -d api.thessarasemijoias.com.br
```

## Criterios de Upgrade Para KVM 2

Recomenda-se upgrade para KVM 2 se ocorrer qualquer um destes sinais:

- RAM acima de 75% a 80% de forma recorrente.
- CPU acima de 70% por varios minutos em horario normal.
- Checkout levando mais de 3 a 5 segundos por causa do servidor.
- Webhook Stripe atrasando ou falhando.
- MySQL com consultas lentas frequentes.
- Builds travando ou deixando o site indisponivel.
- Disco acima de 70%.
- Muitos uploads de imagem.
- Muitos pedidos simultaneos.
- Campanhas trazendo acessos simultaneos.
- Admin/dashboard ficando lento.
- Backups demorando ou consumindo muito disco.

## Riscos Tecnicos e Comerciais

Riscos tecnicos:

- Aplicacao e banco juntos aumentam impacto de falha.
- 1 vCPU limita builds, MySQL, Node, Sharp e picos simultaneos.
- Sem backup testado, erro operacional pode virar perda de dados.
- CORS aberto e admin JWT sem role/admin sao riscos de seguranca.
- Logs e uploads podem consumir disco silenciosamente.
- Deploy malfeito pode quebrar checkout, webhook ou admin.

Riscos comerciais:

- Lentidao pode ser percebida como problema do sistema, nao da VPS.
- Crescimento rapido pode exigir upgrade emergencial.
- Infra barata reduz custo inicial, mas exige monitoramento.
- Indisponibilidade em horario de venda impacta confianca do cliente.

Frase contratual/comercial sugerida:

> O projeto pode iniciar em VPS de entrada para validacao e operacao inicial, desde que respeitados os limites de trafego e recursos. Conforme aumento de acessos, pedidos, imagens, integracoes e volume de dados, podera ser necessario upgrade de infraestrutura para manter desempenho, seguranca e disponibilidade.

## Recomendacao Final

Use a **Hostinger KVM 1 inicialmente**, mas nao como configuracao sem ajustes.

Classificacao final: **B) KVM 1 e possivel, mas exige ajustes.**

Motivo: a arquitetura do projeto e compatiel com uma VPS pequena porque os frontends sao estaticos, o backend e Node/Express simples e o banco MySQL pode rodar localmente no inicio. Porem, para producao real, e necessario corrigir seguranca de CORS/admin auth, controlar recursos, otimizar imagens, configurar backup, rotacao de logs, SSL, firewall e preferir builds fora da VPS.
