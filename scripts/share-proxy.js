const http = require('http');

const PROXY_PORT = 5700;
const BACKEND_PORT = 3333;
const ADMIN_PORT = 5500;
const STORE_PORT = 5600;

process.on('uncaughtException', (error) => {
  console.error('[share-proxy] erro nao tratado:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('[share-proxy] promise rejeitada:', error);
});

const server = http.createServer((req, res) => {
  proxyHttpRequest(req, res, getTarget(req.url || '/'));
});

server.on('clientError', (_error, socket) => {
  socket.destroy();
});

server.on('upgrade', (req, socket, head) => {
  proxyUpgradeRequest(req, socket, head, getTarget(req.url || '/'));
});

server.listen(PROXY_PORT, '127.0.0.1', () => {
  console.log(`[share-proxy] online em http://127.0.0.1:${PROXY_PORT}`);
  console.log('[share-proxy] admin: /');
  console.log('[share-proxy] loja: /loja/');
});

function getTarget(pathname) {
  if (pathname.startsWith('/loja')) {
    return { port: STORE_PORT, label: 'store' };
  }

  if (
    pathname.startsWith('/store') ||
    pathname.startsWith('/uploads') ||
    pathname.startsWith('/webhook') ||
    pathname.startsWith('/admin')
  ) {
    return { port: BACKEND_PORT, label: 'backend' };
  }

  return { port: ADMIN_PORT, label: 'admin' };
}

function proxyHttpRequest(req, res, target) {
  ignoreSocketErrors(req.socket);
  ignoreSocketErrors(res.socket);

  const proxyRequest = http.request(
    {
      hostname: '127.0.0.1',
      port: target.port,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        host: `127.0.0.1:${target.port}`,
      },
    },
    (proxyResponse) => {
      res.writeHead(proxyResponse.statusCode || 502, proxyResponse.headers);
      proxyResponse.pipe(res);
      proxyResponse.on('error', () => {
        res.destroy();
      });
    },
  );

  proxyRequest.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    }

    res.end(`Servico indisponivel: ${target.label}`);
  });

  req.on('error', () => {
    proxyRequest.destroy();
  });

  req.on('aborted', () => {
    proxyRequest.destroy();
  });

  res.on('error', () => {
    proxyRequest.destroy();
  });

  res.on('close', () => {
    if (!res.writableEnded) {
      proxyRequest.destroy();
    }
  });

  req.pipe(proxyRequest);
}

function ignoreSocketErrors(socket) {
  if (!socket || socket.__shareProxyIgnoresErrors) {
    return;
  }

  socket.__shareProxyIgnoresErrors = true;
  socket.on('error', () => {});
}

function proxyUpgradeRequest(req, socket, head, target) {
  ignoreSocketErrors(socket);

  const proxySocket = http.request({
    hostname: '127.0.0.1',
    port: target.port,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: `127.0.0.1:${target.port}`,
    },
  });

  proxySocket.on('upgrade', (proxyResponse, upstreamSocket, upstreamHead) => {
    upstreamSocket.on('error', () => {
      socket.destroy();
    });

    socket.write(
      `HTTP/${proxyResponse.httpVersion} ${proxyResponse.statusCode} ${proxyResponse.statusMessage}\r\n` +
        Object.entries(proxyResponse.headers)
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
          .join('\r\n') +
        '\r\n\r\n',
    );
    upstreamSocket.write(upstreamHead);
    upstreamSocket.pipe(socket);
    socket.pipe(upstreamSocket);
  });

  proxySocket.on('error', () => {
    socket.destroy();
  });

  proxySocket.end(head);
}
