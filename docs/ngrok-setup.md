# Publicacao Temporaria com Ngrok

Este projeto foi preparado para funcionar com uma unica URL publica do `ngrok`, expondo apenas o `frontend-admin`.

O frontend usa `/admin` como API base e o Vite faz proxy local para o backend em `http://127.0.0.1:3333`.

## Enderecos locais

- frontend: `http://localhost:5500`
- backend: `http://localhost:3333`

## Antes de abrir o ngrok

Garanta que os dois processos estejam rodando:

```powershell
npm.cmd run dev
```

Para demonstracao guiada com painel local de status, prefira:

```powershell
npm.cmd run share
```

ou execute diretamente:

```powershell
iniciar-compartilhamento.bat
```

Esse modo sobe:

- backend local
- frontend admin local
- tunel do ngrok
- painel web local em `http://localhost:5601`

No painel web voce consegue ver:

- status do backend
- status do frontend
- URL publica do ngrok
- link rapido para abrir o sistema
- botao para copiar a URL publica

ou rode separadamente:

```powershell
cd backend
npm.cmd run dev
```

```powershell
cd frontend-admin
npm.cmd run dev -- --host 0.0.0.0 --port 5500
```

## Instalar o ngrok

Se ainda nao estiver instalado:

1. baixe em `https://ngrok.com/download`
2. instale no Windows
3. autentique com seu token:

```powershell
ngrok config add-authtoken SEU_TOKEN
```

## Abrir o admin para o cliente

Com frontend e backend locais rodando:

```powershell
ngrok http 5500
```

O `ngrok` vai gerar uma URL parecida com:

```text
https://abc123.ngrok-free.app
```

Essa sera a URL que o cliente deve abrir.

Se estiver usando o modo guiado com painel local, a URL tambem aparece automaticamente em:

```text
http://localhost:5601
```

## Como isso funciona

- o cliente acessa a URL publica do `ngrok`
- o `ngrok` aponta para o Vite em `5500`
- o Vite repassa `/admin` e `/uploads` para o backend local em `3333`

Assim, voce nao precisa expor o backend separadamente.

## Cuidados

- seu PC precisa ficar ligado
- o `ngrok` precisa continuar aberto
- se reiniciar o `ngrok`, a URL publica muda
- isso serve para demonstracao ou operacao inicial controlada, nao para producao

## Encerrar tudo

Para parar os processos do modo guiado:

```powershell
npm.cmd run share:stop
```

ou:

```powershell
parar-compartilhamento.bat
```
