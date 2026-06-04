@echo off
cd /d "%~dp0"
title Encerrar Compartilhamento - Eliane
node scripts\stop-share.js
echo.
echo [share] pressione qualquer tecla para fechar esta janela.
pause >nul
