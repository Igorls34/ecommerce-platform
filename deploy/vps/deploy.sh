#!/bin/bash
set -e

echo "📁 Entrando na pasta do projeto Thessara..."
cd /var/www/thessara

echo "⬇️ Atualizando codigo pelo GitHub..."
git pull origin main

echo "🛠️ Instalando dependencias, buildando backend e rodando migracoes..."
npm --prefix backend install
npm --prefix backend run build
npm --prefix backend run migrate:deploy

echo "📋 Carregando variaveis de ambiente..."
set -a
[ -f backend/.env ] && source backend/.env
set +a

echo "🛍️ Instalando dependencias e buildando frontend da loja..."
npm --prefix frontend-store install
export $(grep -v '^#' backend/.env | grep '^VITE_' | xargs) 2>/dev/null || true
VITE_STORE_API_URL=/store \
  VITE_SITE_URL=https://thessarasemijoias.com.br \
  npm --prefix frontend-store run build

echo "🧭 Instalando dependencias e buildando painel admin..."
npm --prefix frontend-admin install
VITE_API_URL=/admin \
  VITE_STORE_PUBLIC_URL=https://thessarasemijoias.com.br \
  npm --prefix frontend-admin run build

echo "🔁 Reiniciando backend com PM2..."
pm2 reload thessara-api

echo "🌐 Atualizando Nginx..."
cp deploy/vps/nginx.conf /etc/nginx/sites-enabled/thessara
nginx -t && sudo systemctl reload nginx

echo "✅ Deploy da Thessara finalizado."
