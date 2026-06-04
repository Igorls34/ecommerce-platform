@echo off
setlocal
cd /d "%~dp0"
title Compartilhamento do Sistema - Eliane

if not exist "share-runtime" mkdir "share-runtime"

echo [share] encerrando sessoes antigas nas portas do compartilhamento...
node scripts\stop-share.js

echo.
echo [share] iniciando etapas com validacao individual...
node scripts\start-share.js

echo.
echo [share] painel local: http://localhost:5601
echo [share] frontend admin: http://localhost:5500
echo [share] loja: http://localhost:5600
echo [share] proxy publico local: http://localhost:5700
echo [share] backend: http://localhost:3333
echo.
start "" http://localhost:5601
pause
