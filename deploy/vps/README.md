# Deploy em VPS

Este projeto foi simplificado para rodar em uma VPS com:

- Node.js 20 ou 22
- MySQL 8
- PM2
- Nginx
- Certbot para HTTPS

## Estrutura na VPS

```bash
/var/www/thessara
  backend/
  frontend-store/
  frontend-admin/
```

## Primeira instalacao

```bash
sudo apt update
sudo apt install -y git nginx mysql-server

curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www
git clone https://github.com/Igorls34/projeto-site-eliane.git /var/www/thessara
cd /var/www/thessara
```

## Banco

Crie o banco e usuario no MySQL:

```sql
CREATE DATABASE thessara CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'thessara'@'localhost' IDENTIFIED BY 'troque-esta-senha';
GRANT ALL PRIVILEGES ON thessara.* TO 'thessara'@'localhost';
FLUSH PRIVILEGES;
```

Copie `deploy/vps/backend.env.example` para `backend/.env` e ajuste os valores:

```bash
cp deploy/vps/backend.env.example backend/.env
nano backend/.env
```

## Build

```bash
npm --prefix backend install
npm --prefix backend run build
npm --prefix backend run migrate:deploy

npm --prefix frontend-store install
VITE_STORE_API_URL=https://api.thessarasemijoias.com.br/store npm --prefix frontend-store run build

npm --prefix frontend-admin install
VITE_API_URL=https://api.thessarasemijoias.com.br/admin VITE_STORE_PUBLIC_URL=https://thessarasemijoias.com.br npm --prefix frontend-admin run build
```

## PM2

```bash
pm2 start deploy/vps/ecosystem.config.cjs
pm2 save
pm2 startup
```

## Nginx

Copie o exemplo:

```bash
sudo cp deploy/vps/nginx.conf /etc/nginx/sites-available/thessara
sudo ln -s /etc/nginx/sites-available/thessara /etc/nginx/sites-enabled/thessara
sudo nginx -t
sudo systemctl reload nginx
```

Depois configure HTTPS:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d thessarasemijoias.com.br -d www.thessarasemijoias.com.br -d admin.thessarasemijoias.com.br -d api.thessarasemijoias.com.br
```

## Atualizacao

```bash
cd /var/www/thessara
git pull
npm --prefix backend install
npm --prefix backend run build
npm --prefix backend run migrate:deploy
pm2 reload thessara-api

VITE_STORE_API_URL=https://api.thessarasemijoias.com.br/store npm --prefix frontend-store run build
VITE_API_URL=https://api.thessarasemijoias.com.br/admin VITE_STORE_PUBLIC_URL=https://thessarasemijoias.com.br npm --prefix frontend-admin run build
sudo systemctl reload nginx
```
