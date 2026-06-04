const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile, execFileSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const RUNTIME_DIR = path.join(ROOT_DIR, 'share-runtime');
const RUNTIME_STATE_PATH = path.join(RUNTIME_DIR, 'state.json');
const RUNTIME_PIDS_PATH = path.join(RUNTIME_DIR, 'pids.json');
const NGROK_ERR_LOG_PATH = path.join(RUNTIME_DIR, 'ngrok.err.log');
const NGROK_OUT_LOG_PATH = path.join(RUNTIME_DIR, 'ngrok.out.log');
const BACKEND_ENV_PATH = path.join(ROOT_DIR, 'backend', '.env');

const BACKEND_PORT = 3333;
const FRONTEND_PORT = 5500;
const STORE_PORT = 5600;
const PROXY_PORT = 5700;
const DASHBOARD_PORT = 5601;
const NGROK_API_PORT = 4040;

ensureDir(RUNTIME_DIR);

const state = loadInitialState();

const server = http.createServer(async (req, res) => {
  if (req.url === '/api/status') {
    await refreshStatus();
    respondJson(res, state);
    return;
  }

  if (req.url === '/api/stop' && req.method === 'POST') {
    stopShareProcesses();
    respondJson(res, { ok: true });
    setTimeout(() => process.exit(0), 300);
    return;
  }

  if (req.url === '/api/config' && req.method === 'GET') {
    respondJson(res, readEditableConfig());
    return;
  }

  if (req.url === '/api/config' && req.method === 'POST') {
    try {
      const payload = await readRequestJson(req);
      const updated = writeEditableConfig(payload || {});
      respondJson(res, { ok: true, config: updated });
    } catch (error) {
      respondJson(
        res,
        {
          ok: false,
          error: error.message || 'Não foi possível salvar as configuracoes.',
        },
        500,
      );
    }
    return;
  }

  if (req.url === '/api/seed-demo' && req.method === 'POST') {
    try {
      const result = await runBackendNpmScript('seed:demo');
      respondJson(res, { ok: true, ...result });
    } catch (error) {
      respondJson(
        res,
        {
          ok: false,
          error: error.message || 'Não foi possível popular o banco.',
          output: error.output || '',
        },
        500,
      );
    }
    return;
  }

  if (req.url === '/api/clear-demo' && req.method === 'POST') {
    try {
      const result = await runBackendNpmScript('seed:demo:clear');
      respondJson(res, { ok: true, ...result });
    } catch (error) {
      respondJson(
        res,
        {
          ok: false,
          error: error.message || 'Não foi possível limpar os produtos de teste.',
          output: error.output || '',
        },
        500,
      );
    }
    return;
  }

  if (req.url === '/api/run-visible-tests' && req.method === 'POST') {
    try {
      const result = await runVisiblePlaywrightTests();
      respondJson(res, { ok: true, ...result });
    } catch (error) {
      respondJson(
        res,
        {
          ok: false,
          error: error.message || 'Não foi possível executar os testes visiveis.',
          output: error.output || '',
        },
        500,
      );
    }
    return;
  }

  respondHtml(res, renderDashboard());
});

server.listen(DASHBOARD_PORT, '127.0.0.1', () => {
  persistState();
  console.log(`[share] Painel local: http://localhost:${DASHBOARD_PORT}`);
});

setInterval(() => {
  refreshStatus().catch(() => {});
}, 3000);

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function loadInitialState() {
  if (fs.existsSync(RUNTIME_STATE_PATH)) {
    try {
      const loadedState = JSON.parse(
        fs.readFileSync(RUNTIME_STATE_PATH, 'utf8').replace(/^\uFEFF/, ''),
      );

      return {
        startedAt: loadedState.startedAt || new Date().toISOString(),
        backend: loadedState.backend || {
          label: 'Backend',
          port: BACKEND_PORT,
          status: 'starting',
          url: `http://localhost:${BACKEND_PORT}`,
        },
        frontend: loadedState.frontend || {
          label: 'Frontend Admin',
          port: FRONTEND_PORT,
          status: 'starting',
          url: `http://localhost:${FRONTEND_PORT}`,
        },
        store: {
          ...(loadedState.store || {
            label: 'Frontend Loja',
            port: STORE_PORT,
            status: 'starting',
            url: `http://localhost:${STORE_PORT}`,
          }),
          publicUrl: '',
        },
        proxy: loadedState.proxy || {
          label: 'Proxy Publico',
          port: PROXY_PORT,
          status: 'starting',
          url: `http://localhost:${PROXY_PORT}`,
        },
        dashboard: loadedState.dashboard || {
          label: 'Painel Local',
          port: DASHBOARD_PORT,
          status: 'online',
          url: `http://localhost:${DASHBOARD_PORT}`,
        },
        ngrok: {
          label: 'Ngrok',
          status: loadedState.ngrok?.status || 'starting',
          publicUrl: loadedState.ngrok?.publicUrl || '',
          inspectUrl: loadedState.ngrok?.inspectUrl || `http://127.0.0.1:${NGROK_API_PORT}`,
          target: loadedState.ngrok?.target || 'Proxy Publico',
        },
        notes:
          Array.isArray(loadedState.notes) && loadedState.notes.length
            ? loadedState.notes
            : [
                'A URL publica do admin abre na raiz do ngrok.',
                'A URL publica da loja abre no caminho /loja/.',
              ],
      };
    } catch {}
  }

  return {
    startedAt: new Date().toISOString(),
    backend: {
      label: 'Backend',
      port: BACKEND_PORT,
      status: 'starting',
      url: `http://localhost:${BACKEND_PORT}`,
    },
    frontend: {
      label: 'Frontend Admin',
      port: FRONTEND_PORT,
      status: 'starting',
      url: `http://localhost:${FRONTEND_PORT}`,
    },
    store: {
      label: 'Frontend Loja',
      port: STORE_PORT,
      status: 'starting',
      url: `http://localhost:${STORE_PORT}`,
      publicUrl: '',
    },
    proxy: {
      label: 'Proxy Publico',
      port: PROXY_PORT,
      status: 'starting',
      url: `http://localhost:${PROXY_PORT}`,
    },
    dashboard: {
      label: 'Painel Local',
      port: DASHBOARD_PORT,
      status: 'online',
      url: `http://localhost:${DASHBOARD_PORT}`,
    },
    ngrok: {
      label: 'Ngrok',
      status: 'starting',
      publicUrl: '',
      inspectUrl: `http://127.0.0.1:${NGROK_API_PORT}`,
      target: 'Proxy Publico',
    },
    notes: [
      'A URL publica do admin abre na raiz do ngrok.',
      'A URL publica da loja abre no caminho /loja/.',
    ],
  };
}

async function refreshStatus() {
  state.backend.status = (await isHttpOk(`http://127.0.0.1:${BACKEND_PORT}`))
    ? 'online'
    : 'offline';
  state.frontend.status = (await isHttpOk(`http://127.0.0.1:${FRONTEND_PORT}`))
    ? 'online'
    : 'offline';
  state.store.status = (await isHttpOk(`http://127.0.0.1:${STORE_PORT}`)) ? 'online' : 'offline';
  state.proxy = state.proxy || {
    label: 'Proxy Publico',
    port: PROXY_PORT,
    status: 'starting',
    url: `http://localhost:${PROXY_PORT}`,
  };
  state.proxy.status = (await isHttpOk(`http://127.0.0.1:${PROXY_PORT}`)) ? 'online' : 'offline';
  state.dashboard.status = 'online';

  try {
    let tunnelData = await fetchJson(`http://127.0.0.1:${NGROK_API_PORT}/api/tunnels`);
    let tunnels = Array.isArray(tunnelData.tunnels) ? tunnelData.tunnels : [];
    const publicTunnel =
      tunnels.find((item) => {
        const addr = String(item.config?.addr || '');
        return (
          String(item.public_url || '').startsWith('https://') && addr.endsWith(`:${PROXY_PORT}`)
        );
      }) || tunnels.find((item) => String(item.public_url || '').startsWith('https://'));

    if (publicTunnel) {
      state.ngrok.status = 'online';
      state.ngrok.publicUrl = publicTunnel.public_url;
      state.ngrok.forwardTo = publicTunnel.config?.addr || `http://localhost:${PROXY_PORT}`;
      delete state.ngrok.error;
    } else {
      state.ngrok.status = 'starting';
      state.ngrok.publicUrl = '';
    }

    state.store.publicUrl = publicTunnel ? buildStorePublicUrl(publicTunnel.public_url) : '';
  } catch {
    state.ngrok.status = 'offline';
    state.ngrok.publicUrl = '';
    state.ngrok.error = readNgrokError();
    state.store.publicUrl = '';
  }

  persistState();
}

function buildStorePublicUrl(publicUrl) {
  return `${String(publicUrl || '').replace(/\/$/, '')}/loja/`;
}

function runBackendNpmScript(scriptName) {
  return new Promise((resolve, reject) => {
    const backendDir = path.join(ROOT_DIR, 'backend');
    const command = process.platform === 'win32' ? 'cmd.exe' : 'npm';
    const args =
      process.platform === 'win32' ? ['/c', 'npm.cmd', 'run', scriptName] : ['run', scriptName];

    execFile(
      command,
      args,
      {
        cwd: backendDir,
        windowsHide: true,
        timeout: 120000,
      },
      (error, stdout, stderr) => {
        const output = [stdout, stderr].filter(Boolean).join('\n').trim();

        if (error) {
          error.output = output;
          reject(error);
          return;
        }

        resolve({ output });
      },
    );
  });
}

function runVisiblePlaywrightTests() {
  return new Promise((resolve, reject) => {
    const command = process.platform === 'win32' ? 'cmd.exe' : 'npx';
    const args =
      process.platform === 'win32'
        ? ['/c', 'npx.cmd', 'playwright', 'test', '--headed', '--workers=1']
        : ['playwright', 'test', '--headed', '--workers=1'];

    execFile(
      command,
      args,
      {
        cwd: ROOT_DIR,
        windowsHide: false,
        timeout: 180000,
      },
      (error, stdout, stderr) => {
        const output = [stdout, stderr].filter(Boolean).join('\n').trim();

        if (error) {
          error.output = output;
          reject(error);
          return;
        }

        resolve({ output });
      },
    );
  });
}

function isHttpOk(url) {
  return new Promise((resolve) => {
    const request = http.get(url, (response) => {
      response.resume();
      resolve(response.statusCode < 500);
    });

    request.on('error', () => resolve(false));
    request.setTimeout(1500, () => {
      request.destroy();
      resolve(false);
    });
  });
}

function readEditableConfig() {
  const env = parseEnvFile(BACKEND_ENV_PATH);
  const values = {};

  for (const field of EDITABLE_CONFIG_FIELDS) {
    values[field.key] = env[field.key] || '';
  }

  return {
    fields: EDITABLE_CONFIG_FIELDS,
    values,
    envPath: path.relative(ROOT_DIR, BACKEND_ENV_PATH),
    note: 'Tokens, senhas e chaves secretas nao sao exibidos neste painel.',
  };
}

function writeEditableConfig(payload) {
  const allowedKeys = new Set(EDITABLE_CONFIG_FIELDS.map((field) => field.key));
  const updates = {};

  for (const [key, value] of Object.entries(payload.values || payload)) {
    if (allowedKeys.has(key)) {
      updates[key] = String(value ?? '').trim();
    }
  }

  updateEnvFile(BACKEND_ENV_PATH, updates);
  return readEditableConfig();
}

function parseEnvFile(filePath) {
  const content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  const env = {};

  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);

    if (!match) {
      continue;
    }

    env[match[1]] = unquoteEnvValue(match[2]);
  }

  return env;
}

function updateEnvFile(filePath, updates) {
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  const lines = existing.split(/\r?\n/);
  const seen = new Set();
  const nextLines = lines.map((line) => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=/);

    if (!match || !(match[1] in updates)) {
      return line;
    }

    seen.add(match[1]);
    return `${match[1]}=${quoteEnvValue(updates[match[1]])}`;
  });

  for (const [key, value] of Object.entries(updates)) {
    if (!seen.has(key)) {
      nextLines.push(`${key}=${quoteEnvValue(value)}`);
    }
  }

  fs.writeFileSync(filePath, nextLines.join('\n'));
}

function unquoteEnvValue(value) {
  const trimmed = String(value || '').trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function quoteEnvValue(value) {
  const normalized = String(value || '');

  if (!normalized || /[\s#"']/g.test(normalized)) {
    return `"${normalized.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }

  return normalized;
}

function readRequestJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;

      if (body.length > 100000) {
        reject(new Error('Payload muito grande.'));
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('JSON invalido.'));
      }
    });

    req.on('error', reject);
  });
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      let body = '';

      response.on('data', (chunk) => {
        body += chunk;
      });

      response.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });

    request.on('error', reject);
    request.setTimeout(1500, () => {
      request.destroy(new Error('timeout'));
    });
  });
}

function postJson(url, payload) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const body = JSON.stringify(payload);

    const request = http.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (response) => {
        let responseBody = '';

        response.on('data', (chunk) => {
          responseBody += chunk;
        });

        response.on('end', () => {
          if ((response.statusCode || 500) >= 400) {
            reject(new Error(responseBody || `HTTP ${response.statusCode}`));
            return;
          }

          try {
            resolve(responseBody ? JSON.parse(responseBody) : {});
          } catch (error) {
            reject(error);
          }
        });
      },
    );

    request.on('error', reject);
    request.setTimeout(2000, () => {
      request.destroy(new Error('timeout'));
    });
    request.write(body);
    request.end();
  });
}

async function _ensureStoreTunnel() {
  try {
    await postJson(`http://127.0.0.1:${NGROK_API_PORT}/api/tunnels`, {
      addr: STORE_PORT,
      proto: 'http',
      name: 'frontend-store',
    });
    delete state.ngrok.error;
  } catch {
    state.ngrok.error =
      'Não foi possível abrir a URL publica da loja com a configuração atual do ngrok.';
  }
}

function stopShareProcesses() {
  if (!fs.existsSync(RUNTIME_PIDS_PATH)) {
    return;
  }

  try {
    const pidState = JSON.parse(fs.readFileSync(RUNTIME_PIDS_PATH, 'utf8').replace(/^\uFEFF/, ''));
    const targets = [
      ...(Array.isArray(pidState.children) ? pidState.children.map((item) => item.pid) : []),
      pidState.dashboardPid,
    ].filter((pid) => pid && pid !== process.pid);

    for (const pid of targets) {
      try {
        stopProcessTree(pid);
      } catch {}
    }

    fs.rmSync(RUNTIME_PIDS_PATH, { force: true });
  } catch {}
}

function stopProcessTree(pid) {
  if (process.platform === 'win32') {
    execFileSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    return;
  }

  process.kill(pid);
}

function readNgrokError() {
  const content = [readTail(NGROK_ERR_LOG_PATH), readTail(NGROK_OUT_LOG_PATH)].join('\n');

  if (content.includes('ERR_NGROK_4018') || content.includes('authtoken')) {
    return 'Ngrok sem authtoken. Rode: ngrok config add-authtoken SEU_TOKEN';
  }

  if (content.includes('authentication failed')) {
    return 'Falha de autenticação do ngrok. Verifique sua conta e o authtoken.';
  }

  if (
    content.includes('programa especificado') ||
    content.includes('programa especificado') ||
    content.includes('cannot execute') ||
    content.includes('not recognized')
  ) {
    return 'Ngrok nao executou pelo atalho do Windows. Reinstale o ngrok ou confirme se o comando ngrok funciona no PowerShell.';
  }

  return '';
}

function readTail(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8').slice(-4000);
  } catch {
    return '';
  }
}

function persistState() {
  fs.writeFileSync(RUNTIME_STATE_PATH, JSON.stringify(state, null, 2));
}

function renderDashboard() {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Painel de Compartilhamento</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; }
    body { font-family: 'Inter', system-ui, sans-serif; background: #f5f5f5; color: #1a1a1a; }
    .wrap { max-width: 1000px; margin: 0 auto; padding: 28px 20px; display: grid; gap: 18px; }
    .hero { background: linear-gradient(135deg, #111, #1a1a2e); color: #fff; border-radius: 20px; padding: 32px 28px; display: grid; gap: 12px; box-shadow: 0 10px 40px rgba(0,0,0,.12); }
    .hero h1 { font-size: 1.5rem; font-weight: 700; letter-spacing: -.02em; }
    .hero .muted { color: rgba(255,255,255,.55); font-size: .88rem; }
    .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
    .card { background: #fff; border: 1px solid rgba(0,0,0,.06); border-radius: 16px; padding: 18px; display: grid; gap: 10px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
    .card h3 { font-size: .78rem; text-transform: uppercase; letter-spacing: .06em; color: #888; }
    .panel { background: #fff; border: 1px solid rgba(0,0,0,.06); border-radius: 16px; padding: 22px; display: grid; gap: 14px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
    .panel h2 { font-size: 1.1rem; font-weight: 600; color: #111; }
    .status { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 999px; font-size: .8rem; font-weight: 600; text-transform: capitalize; background: #f3f4f6; color: #6b7280; width: fit-content; }
    .status.online { background: #ecfdf5; color: #065f46; }
    .status.starting { background: #fffbeb; color: #92400e; }
    .status.offline, .status.error, .status.stopped { background: #fef2f2; color: #991b1b; }
    .value { font-size: .85rem; background: #f9fafb; border: 1px solid #eee; border-radius: 12px; padding: 12px 14px; overflow-wrap: anywhere; color: #333; }
    .actions { display: flex; gap: 10px; flex-wrap: wrap; }
    button, a.button { appearance: none; border: 0; cursor: pointer; border-radius: 10px; background: #111; color: #fff; text-decoration: none; padding: 10px 18px; font-size: .85rem; font-weight: 600; font-family: inherit; transition: .15s; }
    button:hover, a.button:hover { background: #000; }
    button:disabled { cursor: wait; opacity: .6; }
    .secondary { background: #fff; color: #111; border: 1px solid #ddd; }
    .secondary:hover { background: #f5f5f5; }
    .tool-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .tool-result { display: none; white-space: pre-wrap; }
    .tool-result.is-visible { display: block; border-color: #e5e5e5; background: #fafafa; }
    .config-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    .config-group { border: 1px solid #eee; border-radius: 14px; padding: 16px; display: grid; gap: 12px; background: #fafafa; }
    .config-group h3 { font-size: .9rem; font-weight: 600; padding-bottom: 8px; border-bottom: 1px solid #eee; color: #111; }
    .config-field { display: grid; gap: 5px; }
    .config-field label { color: #666; font-size: .7rem; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; }
    .config-field input { width: 100%; border: 1px solid #e5e5e5; border-radius: 10px; padding: 9px 12px; font: inherit; font-size: .85rem; color: #1a1a1a; background: #fff; }
    .config-field input:focus { border-color: #111; outline: none; box-shadow: 0 0 0 3px rgba(0,0,0,.06); }
    .config-field small { color: #888; font-size: .75rem; line-height: 1.4; }
    .config-actions { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
    .config-notice { border-left: 4px solid #f59e0b; background: #fffbeb; color: #92400e; }
    .muted { color: #888; font-size: .85rem; line-height: 1.5; }
    p { margin: 0; }
    .mono { font-family: 'SF Mono', Consolas, monospace; font-size: .82rem; }
    strong { color: #111; }
    @media (max-width: 800px) { .grid, .config-grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="wrap">
    <section class="hero">
      <h1>Painel de Compartilhamento</h1>
      <p class="muted">URLs públicas para demonstração. Copie os links e compartilhe com o cliente.</p>
      <div class="actions">
        <a id="public-link" class="button" href="#" target="_blank" rel="noreferrer noopener">Abrir Admin</a>
        <a id="store-public-link" class="button secondary" href="#" target="_blank" rel="noreferrer noopener">Abrir Loja</a>
        <a id="store-link" class="button secondary" href="http://localhost:5600" target="_blank" rel="noreferrer noopener">Abrir loja local</a>
        <button id="copy-url" class="secondary">Copiar URL admin</button>
        <button id="copy-store-url" class="secondary">Copiar URL loja</button>
        <button id="refresh" class="secondary">Atualizar agora</button>
      </div>
    </section>
    <section class="grid">
      <div class="card"><h3>Frontend Admin</h3><div id="frontend-status" class="status">Carregando</div><div id="frontend-url" class="value mono"></div></div>
      <div class="card"><h3>Frontend Loja</h3><div id="store-status" class="status">Carregando</div><div id="store-url" class="value mono"></div></div>
      <div class="card"><h3>Backend</h3><div id="backend-status" class="status">Carregando</div><div id="backend-url" class="value mono"></div></div>
      <div class="card"><h3>Ngrok</h3><div id="ngrok-status" class="status">Carregando</div><div id="ngrok-url" class="value mono"></div></div>
    </section>
    <section class="panel">
      <h2>Informacoes Importantes</h2>
      <div class="value"><strong>URL publica:</strong><div id="public-url" class="mono"></div></div>
      <div class="value"><strong>URL publica da loja:</strong><div id="store-public-url" class="mono"></div></div>
      <div class="value"><strong>Loja local:</strong><div id="store-local-url" class="mono"></div></div>
      <div class="value"><strong>Iniciado em:</strong><div id="started-at"></div></div>
      <div class="value"><strong>Inspeção ngrok:</strong><div id="ngrok-inspect" class="mono"></div></div>
    </section>
    <section class="panel">
      <h2>Dados de Teste</h2>
      <div class="tool-row">
        <button id="seed-demo" type="button">Popular banco</button>
        <button id="clear-demo" class="secondary" type="button">Limpar dados</button>
      </div>
      <div id="seed-result" class="value tool-result mono"></div>
    </section>
    <section class="panel">
      <h2>Informações</h2>
      <div class="value">
        <p class="muted">O PC precisa ficar ligado para a URL pública funcionar. Ao reiniciar o ngrok, a URL muda.</p>
        <p class="muted" style="margin-top:6px">Para encerrar: <span class="mono">npm run share:stop</span></p>
      </div>
    </section>
  </div>
  <script>
    async function loadStatus() {
      const response = await fetch('/api/status', { cache: 'no-store' });
      const data = await response.json();
      setCard('frontend', data.frontend.status, data.frontend.url);
      setCard('store', data.store.status, data.store.url);
      setCard('backend', data.backend.status, data.backend.url);
      const ngrokText = data.ngrok.publicUrl || data.ngrok.error || 'Aguardando URL publica...';
      setCard('ngrok', data.ngrok.status, ngrokText);
      document.getElementById('public-url').textContent = data.ngrok.publicUrl || data.ngrok.error || 'Aguardando ngrok...';
      document.getElementById('store-public-url').textContent = data.store.publicUrl || 'Aguardando URL publica da loja...';
      document.getElementById('store-local-url').textContent = data.store.url || '';
      document.getElementById('started-at').textContent = new Date(data.startedAt).toLocaleString('pt-BR');
      document.getElementById('ngrok-inspect').textContent = data.ngrok.inspectUrl || '';
      const link = document.getElementById('public-link');
      const storePublicLink = document.getElementById('store-public-link');
      if (data.ngrok.publicUrl) {
        link.href = data.ngrok.publicUrl;
        link.style.pointerEvents = 'auto';
        link.style.opacity = '1';
      } else {
        link.href = '#';
        link.style.pointerEvents = 'none';
        link.style.opacity = '.6';
      }
      if (data.store.publicUrl) {
        storePublicLink.href = data.store.publicUrl;
        storePublicLink.style.pointerEvents = 'auto';
        storePublicLink.style.opacity = '1';
      } else {
        storePublicLink.href = '#';
        storePublicLink.style.pointerEvents = 'none';
        storePublicLink.style.opacity = '.6';
      }
      window.latestPublicUrl = data.ngrok.publicUrl || '';
      window.latestStorePublicUrl = data.store.publicUrl || '';
    }
    function setCard(prefix, status, value) {
      const statusNode = document.getElementById(prefix + '-status');
      statusNode.textContent = status;
      statusNode.className = 'status ' + status;
      document.getElementById(prefix + '-url').textContent = value || '-';
    }
    document.getElementById('copy-url').addEventListener('click', async () => {
      if (!window.latestPublicUrl) return;
      await navigator.clipboard.writeText(window.latestPublicUrl);
      alert('URL publica copiada.');
    });
    document.getElementById('copy-store-url').addEventListener('click', async () => {
      if (!window.latestStorePublicUrl) return;
      await navigator.clipboard.writeText(window.latestStorePublicUrl);
      alert('URL publica da loja copiada.');
    });
    document.getElementById('refresh').addEventListener('click', loadStatus);
    document.getElementById('seed-demo').addEventListener('click', () => runDemoTool({
      buttonId: 'seed-demo',
      endpoint: '/api/seed-demo',
      busyText: 'Populando...',
      idleText: 'Popular banco de teste',
      startText: 'Executando seed demo no backend...',
      fallbackSuccess: 'Banco populado com sucesso.',
      fallbackError: 'Não foi possível popular o banco.',
    }));
    document.getElementById('clear-demo').addEventListener('click', () => runDemoTool({
      buttonId: 'clear-demo',
      endpoint: '/api/clear-demo',
      busyText: 'Limpando...',
      idleText: 'Limpar dados',
      startText: 'Removendo produtos demo...',
      fallbackSuccess: 'Dados removidos.',
      fallbackError: 'Erro ao limpar.',
    }));

    async function runDemoTool(config) {
      const button = document.getElementById(config.buttonId);
      const resultNode = document.getElementById('seed-result');

      button.disabled = true;
      button.textContent = config.busyText;
      resultNode.className = 'value tool-result is-visible mono';
      resultNode.textContent = config.startText;

      try {
        const response = await fetch(config.endpoint, { method: 'POST' });
        const data = await response.json();

        if (!response.ok || !data.ok) {
          throw new Error(data.error || data.output || config.fallbackError);
        }

        resultNode.className = 'value tool-result is-visible is-ok mono';
        resultNode.textContent = data.output || config.fallbackSuccess;
        await loadStatus();
      } catch (error) {
        resultNode.className = 'value tool-result is-visible is-error mono';
        resultNode.textContent = error.message || config.fallbackError;
      } finally {
        button.disabled = false;
        button.textContent = config.idleText;
      }
    }

    loadStatus();
    setInterval(loadStatus, 4000);
  </script>
</body>
</html>`;
}

function respondHtml(res, html) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

function respondJson(res, payload, statusCode = 200) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}
