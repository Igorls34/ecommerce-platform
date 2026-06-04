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

const EDITABLE_CONFIG_FIELDS = [
  { key: 'MELHOR_ENVIO_API_URL', label: 'Ambiente da API', group: 'Melhor Envio', hint: 'Sandbox ou produção.' },
  { key: 'MELHOR_ENVIO_DEFAULT_SERVICE_ID', label: 'Serviço padrão', group: 'Melhor Envio', hint: 'Usado quando o pedido nao tem servico salvo.' },
  { key: 'MELHOR_ENVIO_USER_AGENT', label: 'User-Agent', group: 'Melhor Envio', hint: 'Identificação exigida pela API.' },
  { key: 'STORE_SENDER_NAME', label: 'Nome', group: 'Remetente - contato', hint: 'Nome impresso como remetente.' },
  { key: 'STORE_SENDER_EMAIL', label: 'E-mail', group: 'Remetente - contato', hint: 'Contato da loja/remetente.' },
  { key: 'STORE_SENDER_PHONE', label: 'Telefone', group: 'Remetente - contato', hint: 'Apenas numeros com DDD.' },
  { key: 'STORE_SENDER_DOCUMENT', label: 'CPF', group: 'Remetente - documentos', hint: 'Use CPF ou CNPJ conforme sua conta.' },
  { key: 'STORE_SENDER_COMPANY_DOCUMENT', label: 'CNPJ', group: 'Remetente - documentos', hint: 'Opcional se usa CPF.' },
  { key: 'STORE_SENDER_STATE_REGISTER', label: 'Inscrição estadual', group: 'Remetente - documentos', hint: 'Número ou ISENTO quando aplicável.' },
  { key: 'STORE_ZIP_CODE', label: 'CEP de origem', group: 'Remetente - endereço', hint: 'CEP usado no calculo de frete.' },
  { key: 'STORE_SENDER_ADDRESS', label: 'Logradouro', group: 'Remetente - endereço', hint: 'Rua/avenida/travessa.' },
  { key: 'STORE_SENDER_NUMBER', label: 'Número', group: 'Remetente - endereço', hint: 'Número do remetente.' },
  { key: 'STORE_SENDER_COMPLEMENT', label: 'Complemento', group: 'Remetente - endereço', hint: 'Opcional.' },
  { key: 'STORE_SENDER_DISTRICT', label: 'Bairro', group: 'Remetente - endereço', hint: 'Bairro do remetente.' },
  { key: 'STORE_SENDER_CITY', label: 'Cidade', group: 'Remetente - endereço', hint: 'Cidade do remetente.' },
  { key: 'STORE_SENDER_STATE', label: 'UF', group: 'Remetente - endereço', hint: 'Ex.: RJ.' },
  { key: 'STORE_STATE', label: 'UF da loja', group: 'Remetente - endereço', hint: 'Fallback para UF de origem.' },
  { key: 'STORE_WEIGHT', label: 'Peso (kg)', group: 'Pacote padrão', hint: 'Peso usado na etiqueta.' },
  { key: 'STORE_LENGTH', label: 'Comprimento (cm)', group: 'Pacote padrão', hint: 'Comprimento da caixa.' },
  { key: 'STORE_WIDTH', label: 'Largura (cm)', group: 'Pacote padrão', hint: 'Largura da caixa.' },
  { key: 'STORE_HEIGHT', label: 'Altura (cm)', group: 'Pacote padrão', hint: 'Altura da caixa.' },
  { key: 'STORE_INSURANCE_VALUE', label: 'Seguro (R$)', group: 'Pacote padrão', hint: 'Valor padrao para simulações de frete.' },
];

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
    :root {
      color-scheme: light;
      --bg: #fff8f5;
      --panel: #ffffff;
      --soft: #f8ebe8;
      --line: #edd7d3;
      --text: #473734;
      --muted: #7a6662;
      --accent: #c9657b;
      --ok: #4f8b67;
      --warn: #c4953d;
      --off: #b86868;
    }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "Segoe UI", sans-serif; background: linear-gradient(180deg, #fff8f5 0%, #fff1ec 100%); color: var(--text); }
    .wrap { max-width: 1120px; margin: 0 auto; padding: 24px; display: grid; gap: 20px; }
    .hero, .panel { background: rgba(255,255,255,.92); border: 1px solid var(--line); border-radius: 24px; box-shadow: 0 18px 40px rgba(130, 92, 85, .08); }
    .hero { padding: 28px; display: grid; gap: 12px; }
    h1, h2, h3, p { margin: 0; }
    .muted { color: var(--muted); }
    .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
    .card { padding: 18px; border-radius: 20px; background: var(--panel); border: 1px solid var(--line); display: grid; gap: 8px; }
    .status { display: inline-flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 999px; width: fit-content; background: var(--soft); color: var(--text); font-weight: 600; text-transform: capitalize; }
    .status.online { color: var(--ok); }
    .status.starting { color: var(--warn); }
    .status.offline, .status.error, .status.stopped { color: var(--off); }
    .value { font-size: 14px; background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 12px; overflow-wrap: anywhere; }
    .actions { display: flex; gap: 12px; flex-wrap: wrap; }
    button, a.button { appearance: none; border: 0; cursor: pointer; border-radius: 14px; background: var(--accent); color: #fff; text-decoration: none; padding: 12px 16px; font-weight: 700; }
    button:disabled { cursor: wait; opacity: .68; }
    .secondary { background: #fff; color: var(--text); border: 1px solid var(--line); }
    .panel { padding: 22px; display: grid; gap: 14px; }
    .tool-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
    .tool-result { display: none; white-space: pre-wrap; }
    .tool-result.is-visible { display: block; }
    .tool-result.is-ok { border-color: rgba(79, 139, 103, .28); color: var(--ok); }
    .tool-result.is-error { border-color: rgba(184, 104, 104, .32); color: var(--off); }
    .tool-result.is-running { border-color: rgba(196, 149, 61, .32); color: var(--warn); }
    .config-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; align-items: start; }
    .config-group { border: 1px solid var(--line); border-radius: 18px; padding: 16px; display: grid; gap: 12px; background: rgba(255,255,255,.72); }
    .config-group h3 { font-size: 1rem; padding-bottom: 8px; border-bottom: 1px solid var(--line); }
    .config-field { display: grid; gap: 6px; }
    .config-field label { color: var(--muted); font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .config-field input { width: 100%; border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; font: inherit; color: var(--text); background: #fff; }
    .config-field small { color: var(--muted); line-height: 1.35; }
    .config-actions { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
    .config-notice { border-left: 4px solid var(--warn); background: #fffaf0; }
    ul { margin: 0; padding-left: 18px; color: var(--muted); }
    .mono { font-family: Consolas, monospace; }
    @media (max-width: 900px) { .grid, .config-grid { grid-template-columns: 1fr; } .wrap { padding: 16px; } }
  </style>
</head>
<body>
  <div class="wrap">
    <section class="hero">
      <p class="muted">Compartilhamento local para demonstracao</p>
      <h1>Painel de Acesso do Cliente</h1>
      <p class="muted">Use esta tela para copiar as URLs publicas, validar os servicos e abrir rapidamente o sistema.</p>
      <div class="actions">
        <a id="public-link" class="button" href="#" target="_blank" rel="noreferrer noopener">Abrir admin publico</a>
        <a id="store-public-link" class="button secondary" href="#" target="_blank" rel="noreferrer noopener">Abrir loja publica</a>
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
      <p class="muted">Popule o banco local com categorias e produtos demonstrativos para visualizar a loja cheia.</p>
      <div class="tool-row">
        <button id="seed-demo" type="button">Popular banco de teste</button>
        <button id="clear-demo" class="secondary" type="button">Limpar produtos de teste</button>
        <span class="muted">Cria/atualiza 7 categorias e 42 produtos.</span>
      </div>
      <div id="seed-result" class="value tool-result mono"></div>
    </section>
    <section class="panel">
      <h2>Configuracoes Operacionais</h2>
      <p class="muted">Edite dados usados pelo backend em frete, remetente e Melhor Envio. Tokens e senhas continuam protegidos no arquivo .env.</p>
      <div class="value config-notice">
        <strong>Aplicacao das mudancas</strong>
        <div>Salvar atualiza o arquivo <span class="mono">backend/.env</span>. Para o backend usar os novos valores, encerre e inicie o compartilhamento novamente.</div>
      </div>
      <form id="config-form" class="config-grid"></form>
      <div class="config-actions">
        <button id="save-config" type="button">Salvar configuracoes</button>
        <button id="reload-config" type="button" class="secondary">Recarregar configuracoes</button>
        <span class="muted">Reinicie o compartilhamento apos salvar para o backend carregar os novos valores.</span>
      </div>
      <div id="config-result" class="value tool-result mono"></div>
    </section>
    <section class="panel">
      <h2>Testes Visiveis</h2>
      <p class="muted">Abre o navegador do Playwright para voce acompanhar os fluxos testados no admin e na loja.</p>
      <div class="tool-row">
        <button id="run-visible-tests" type="button">Rodar testes visiveis</button>
        <span class="muted">Executa <span class="mono">npx playwright test --headed --workers=1</span>.</span>
      </div>
      <div id="test-result" class="value tool-result mono"></div>
    </section>
    <section class="panel">
      <h2>Observacoes</h2>
      <ul>
        <li>Seu PC precisa ficar ligado e conectado para a URL publica continuar funcionando.</li>
        <li>Se reiniciar o ngrok, a URL publica muda.</li>
        <li>Para encerrar tudo, execute <span class="mono">parar-compartilhamento.bat</span>.</li>
        <li>A loja publica esta incluida no compartilhamento local para facilitar seu trabalho de front-end.</li>
      </ul>
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
    document.getElementById('reload-config').addEventListener('click', loadConfig);
    document.getElementById('save-config').addEventListener('click', saveConfig);
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
      idleText: 'Limpar produtos de teste',
      startText: 'Removendo produtos demo e preservando categorias oficiais...',
      fallbackSuccess: 'Produtos de teste removidos com sucesso.',
      fallbackError: 'Não foi possível limpar os produtos de teste.',
    }));
    document.getElementById('run-visible-tests').addEventListener('click', runVisibleTests);

    async function loadConfig() {
      const resultNode = document.getElementById('config-result');

      try {
        const response = await fetch('/api/config', { cache: 'no-store' });
        const data = await response.json();
        renderConfigForm(data.fields || [], data.values || {});
        resultNode.className = 'value tool-result is-visible is-ok mono';
        resultNode.textContent = data.note || 'Configurações carregadas.';
      } catch (error) {
        resultNode.className = 'value tool-result is-visible is-error mono';
        resultNode.textContent = error.message || 'Não foi possível carregar as configuracoes.';
      }
    }

    function renderConfigForm(fields, values) {
      const form = document.getElementById('config-form');
      const groups = fields.reduce((map, field) => {
        const group = field.group || 'Geral';
        map[group] = map[group] || [];
        map[group].push(field);
        return map;
      }, {});

      form.innerHTML = Object.entries(groups)
        .map(([group, groupFields]) => (
          '<div class="config-group"><h3>' +
          escapeHtml(group) +
          '</h3>' +
          groupFields
            .map((field) => (
              '<div class="config-field">' +
              '<label for="cfg-' +
              escapeHtml(field.key) +
              '">' +
              escapeHtml(field.label) +
              '</label>' +
              '<input id="cfg-' +
              escapeHtml(field.key) +
              '" name="' +
              escapeHtml(field.key) +
              '" value="' +
              escapeAttribute(values[field.key] || '') +
              '" />' +
              '<small>' +
              escapeHtml(field.hint || field.key) +
              '</small>' +
              '</div>'
            ))
            .join('') +
          '</div>'
        ))
        .join('');
    }

    async function saveConfig() {
      const button = document.getElementById('save-config');
      const resultNode = document.getElementById('config-result');
      const values = {};

      for (const input of document.querySelectorAll('#config-form input[name]')) {
        values[input.name] = input.value;
      }

      button.disabled = true;
      resultNode.className = 'value tool-result is-visible is-running mono';
      resultNode.textContent = 'Salvando configurações...';

      try {
        const response = await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ values }),
        });
        const data = await response.json();

        if (!response.ok || !data.ok) {
          throw new Error(data.error || 'Não foi possível salvar as configuracoes.');
        }

        renderConfigForm(data.config.fields || [], data.config.values || {});
        resultNode.className = 'value tool-result is-visible is-ok mono';
        resultNode.textContent = 'Configurações salvas. Reinicie o compartilhamento para aplicar no backend.';
      } catch (error) {
        resultNode.className = 'value tool-result is-visible is-error mono';
        resultNode.textContent = error.message || 'Não foi possível salvar as configuracoes.';
      } finally {
        button.disabled = false;
      }
    }

    function escapeHtml(value) {
      return String(value || '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }[char]));
    }

    function escapeAttribute(value) {
      return escapeHtml(value).replace(new RegExp(String.fromCharCode(96), 'g'), '&#96;');
    }

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

    async function runVisibleTests() {
      const button = document.getElementById('run-visible-tests');
      const resultNode = document.getElementById('test-result');

      button.disabled = true;
      button.textContent = 'Rodando testes...';
      resultNode.className = 'value tool-result is-visible is-running mono';
      resultNode.textContent = 'Abrindo navegador do Playwright. Aguarde o fluxo terminar...';

      try {
        const response = await fetch('/api/run-visible-tests', { method: 'POST' });
        const data = await response.json();

        if (!response.ok || !data.ok) {
          throw new Error(data.error || data.output || 'Não foi possível executar os testes visiveis.');
        }

        resultNode.className = 'value tool-result is-visible is-ok mono';
        resultNode.textContent = data.output || 'Testes visiveis finalizados com sucesso.';
      } catch (error) {
        resultNode.className = 'value tool-result is-visible is-error mono';
        resultNode.textContent = error.message || 'Não foi possível executar os testes visiveis.';
      } finally {
        button.disabled = false;
        button.textContent = 'Rodar testes visiveis';
      }
    }

    loadStatus();
    loadConfig();
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
