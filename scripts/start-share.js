const fs = require('fs');
const http = require('http');
const net = require('net');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const RUNTIME_DIR = path.join(ROOT_DIR, 'share-runtime');
const STATE_PATH = path.join(RUNTIME_DIR, 'state.json');
const PIDS_PATH = path.join(RUNTIME_DIR, 'pids.json');
const RUN_ID = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);

const SERVICES = [
  {
    name: 'backend',
    label: 'Backend',
    port: 3333,
    url: 'http://localhost:3333',
    cwd: path.join(ROOT_DIR, 'backend'),
    command: 'cmd.exe',
    args: ['/c', 'npm.cmd run dev'],
    healthUrl: 'http://127.0.0.1:3333',
    timeoutMs: 70000,
    required: true,
  },
  {
    name: 'frontend',
    label: 'Frontend Admin',
    port: 5500,
    url: 'http://localhost:5500',
    cwd: path.join(ROOT_DIR, 'frontend-admin'),
    command: 'cmd.exe',
    args: ['/c', 'npm.cmd run dev -- --host 0.0.0.0 --port 5500'],
    healthUrl: 'http://127.0.0.1:5500',
    timeoutMs: 50000,
    required: true,
  },
  {
    name: 'store',
    label: 'Frontend Loja',
    port: 5600,
    url: 'http://localhost:5600',
    cwd: path.join(ROOT_DIR, 'frontend-store'),
    command: 'cmd.exe',
    args: ['/c', 'npm.cmd run dev -- --host 0.0.0.0 --port 5600 --base /loja/'],
    healthUrl: 'http://127.0.0.1:5600',
    timeoutMs: 50000,
    required: true,
    extraState: { publicUrl: '' },
  },
  {
    name: 'proxy',
    label: 'Proxy Publico',
    port: 5700,
    url: 'http://localhost:5700',
    cwd: ROOT_DIR,
    command: process.execPath,
    args: ['scripts/share-proxy.js'],
    healthUrl: 'http://127.0.0.1:5700',
    timeoutMs: 30000,
    required: true,
  },
  {
    name: 'ngrok',
    label: 'Ngrok',
    cwd: ROOT_DIR,
    command: 'cmd.exe',
    args: ['/c', 'ngrok http 5700 --log=stdout'],
    timeoutMs: 40000,
    required: false,
    state: {
      status: 'starting',
      publicUrl: '',
      inspectUrl: 'http://127.0.0.1:4040',
      target: 'Proxy Publico',
    },
    wait: waitForNgrok,
  },
  {
    name: 'stripe',
    label: 'Stripe CLI',
    cwd: ROOT_DIR,
    command: 'cmd.exe',
    args: ['/c', 'npm.cmd run stripe:listen'],
    timeoutMs: 6000,
    required: false,
    state: {
      status: 'starting',
      target: 'http://localhost:3333/webhook/stripe',
      log: 'share-runtime/stripe.out.log',
    },
    wait: waitForProcessToStayAlive,
  },
  {
    name: 'dashboard',
    label: 'Painel Local',
    port: 5601,
    url: 'http://localhost:5601',
    cwd: ROOT_DIR,
    command: process.execPath,
    args: ['scripts/share-dashboard.js'],
    healthUrl: 'http://127.0.0.1:5601',
    timeoutMs: 30000,
    required: true,
  },
];

const state = {
  startedAt: new Date().toISOString(),
  notes: [
    'A URL publica do admin abre na raiz do ngrok.',
    'A URL publica da loja abre no caminho /loja/.',
    'Stripe CLI encaminha webhooks locais para /webhook/stripe e precisa estar autenticada.',
  ],
};
const children = [];

main().catch((error) => {
  console.error(`[share] falha geral: ${error.message}`);
  persistState();
  persistPids();
  process.exitCode = 1;
});

async function main() {
  ensureRuntimeDir();
  initializeState();
  persistState();

  for (const service of SERVICES) {
    await startStep(service);
  }

  persistPids();
  printSummary();
}

function ensureRuntimeDir() {
  fs.mkdirSync(RUNTIME_DIR, { recursive: true });
}

function initializeState() {
  for (const service of SERVICES) {
    state[service.name] =
      service.state ||
      {
        label: service.label,
        ...(service.port ? { port: service.port } : {}),
        status: 'pending',
        ...(service.url ? { url: service.url } : {}),
        ...(service.extraState || {}),
      };
  }
}

async function startStep(service) {
  console.log(`[share] etapa: ${service.label}`);
  updateService(service.name, { status: 'checking', error: '' });

  if (service.name === 'ngrok') {
    const existingTunnel = await getExistingNgrokTunnel();

    if (existingTunnel) {
      updateService(service.name, {
        status: 'online',
        publicUrl: existingTunnel.public_url,
        forwardTo: existingTunnel.config?.addr || 'http://localhost:5700',
      });
      console.log(`[share] ${service.label}: online (sessão existente)`);
      return;
    }
  }

  if (service.port) {
    const portAvailable = await isPortAvailable(service.port);

    if (!portAvailable) {
      if (service.healthUrl && (await isHttpOk(service.healthUrl))) {
        updateService(service.name, { status: 'online', error: '' });
        console.log(`[share] ${service.label}: online (porta ${service.port} ja ativa)`);
        return;
      }

      const message = `Porta ${service.port} ocupada. Execute parar-compartilhamento.bat e tente novamente.`;
      updateService(service.name, { status: 'error', error: message });
      console.log(`[share] ${service.label}: ${message}`);

      if (service.required) {
        return;
      }
    }
  }

  truncateLogs(service.name);
  updateService(service.name, { status: 'starting' });

  const pid = startBackgroundProcess(service);

  children.push({ name: service.name, pid });
  persistPids();

  try {
    const result = service.wait
      ? await service.wait(service, { pid })
      : await waitForHttp(service.healthUrl, service.timeoutMs);
    updateService(service.name, { status: result.status || 'online', ...(result.patch || {}) });
    console.log(`[share] ${service.label}: ${result.status || 'online'}`);
  } catch (error) {
    const patch = {
      status: service.required ? 'error' : 'warning',
      error: error.message,
    };
    updateService(service.name, patch);
    console.log(`[share] ${service.label}: ${patch.status} - ${error.message}`);
  }
}

function startBackgroundProcess(service) {
  if (process.platform !== 'win32') {
    throw new Error('Launcher de compartilhamento esta configurado para Windows.');
  }

  const outPath = logPath(service.name, 'out');
  const errPath = logPath(service.name, 'err');
  const runnerPath = writeServiceRunner(service, outPath, errPath);
  const command = [
    '$ErrorActionPreference = "Stop";',
    `$process = Start-Process -FilePath 'cmd.exe' ` +
      `-ArgumentList @('/c', ${psQuote(runnerPath)}) ` +
      `-WorkingDirectory ${psQuote(service.cwd)} ` +
      '-WindowStyle Hidden -PassThru;',
    '$process.Id',
  ].join(' ');
  const output = execFileSync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command],
    { encoding: 'utf8', windowsHide: true },
  ).trim();
  const pid = Number(output.split(/\s+/).pop());

  if (!pid) {
    throw new Error(`Nao foi possivel obter PID de ${service.label}.`);
  }

  return pid;
}

function writeServiceRunner(service, outPath, errPath) {
  const runnerPath = path.join(RUNTIME_DIR, `${service.name}.${RUN_ID}.cmd`);
  const commandLine = buildCommandLine(service);
  const content = [
    '@echo off',
    `cd /d "${service.cwd}"`,
    `${commandLine} > "${outPath}" 2> "${errPath}"`,
  ].join('\r\n');

  fs.writeFileSync(runnerPath, content);
  return runnerPath;
}

function psQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function cmdQuote(value) {
  return `"${String(value).replace(/"/g, '\\"')}"`;
}

function buildCommandLine(service) {
  if (
    service.command.toLowerCase() === 'cmd.exe' &&
    service.args[0]?.toLowerCase() === '/c' &&
    service.args.length === 2
  ) {
    return service.args[1];
  }

  return [cmdQuote(service.command), ...service.args.map(cmdQuote)].join(' ');
}

async function getExistingNgrokTunnel() {
  try {
    const tunnels = await fetchJson('http://127.0.0.1:4040/api/tunnels');
    return Array.isArray(tunnels.tunnels)
      ? tunnels.tunnels.find((item) => String(item.public_url || '').startsWith('https://'))
      : null;
  } catch {
    return null;
  }
}

function updateService(name, patch) {
  state[name] = {
    ...(state[name] || {}),
    ...patch,
  };
  persistState();
}

function truncateLogs(name) {
  fs.writeFileSync(logPath(name, 'out'), '');
  fs.writeFileSync(logPath(name, 'err'), '');
  updateService(name, {
    outLog: path.relative(ROOT_DIR, logPath(name, 'out')).replace(/\\/g, '/'),
    errLog: path.relative(ROOT_DIR, logPath(name, 'err')).replace(/\\/g, '/'),
  });
}

function logPath(name, stream) {
  return path.join(RUNTIME_DIR, `${name}.${RUN_ID}.${stream}.log`);
}

function persistState() {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

function persistPids() {
  fs.writeFileSync(
    PIDS_PATH,
    JSON.stringify(
      {
        launcherType: 'node',
        startedAt: state.startedAt,
        children,
        dashboardPid: children.find((child) => child.name === 'dashboard')?.pid || null,
      },
      null,
      2,
    ),
  );
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

function waitForHttp(url, timeoutMs) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const tick = async () => {
      if (await isHttpOk(url)) {
        resolve({ status: 'online' });
        return;
      }

      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error(`Nao respondeu em ${url}. Veja os logs em share-runtime.`));
        return;
      }

      setTimeout(tick, 1000);
    };

    tick();
  });
}

function isHttpOk(url) {
  return new Promise((resolve) => {
    const request = http.get(url, (response) => {
      response.resume();
      resolve((response.statusCode || 500) < 500);
    });

    request.on('error', () => resolve(false));
    request.setTimeout(1200, () => {
      request.destroy();
      resolve(false);
    });
  });
}

function waitForNgrok(service) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const tunnels = await fetchJson('http://127.0.0.1:4040/api/tunnels');
        const tunnel = Array.isArray(tunnels.tunnels)
          ? tunnels.tunnels.find((item) => String(item.public_url || '').startsWith('https://'))
          : null;

        if (tunnel) {
          resolve({
            status: 'online',
            patch: {
              publicUrl: tunnel.public_url,
              forwardTo: tunnel.config?.addr || 'http://localhost:5700',
            },
          });
          return;
        }
      } catch {}

      if (Date.now() - startedAt > service.timeoutMs) {
        reject(new Error(readTail(logPath(service.name, 'err')) || 'Ngrok nao retornou URL publica.'));
        return;
      }

      setTimeout(tick, 1000);
    };

    tick();
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
    request.setTimeout(1200, () => request.destroy(new Error('timeout')));
  });
}

function waitForProcessToStayAlive(service) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const errorLog = readTail(logPath(service.name, 'err'));

      if (/not logged in|not.*auth|erro|error/i.test(errorLog)) {
        reject(new Error(errorLog || `${service.label} nao iniciou corretamente.`));
        return;
      }

      resolve({ status: 'online' });
    }, service.timeoutMs);
  });
}

function readTail(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8').slice(-2000).trim();
  } catch {
    return '';
  }
}

function printSummary() {
  console.log('');
  console.log('[share] resumo:');
  for (const service of SERVICES) {
    const serviceState = state[service.name] || {};
    const suffix = serviceState.error ? ` - ${serviceState.error}` : '';
    console.log(`  ${service.label}: ${serviceState.status}${suffix}`);
  }
  console.log('');
  console.log('[share] painel local: http://localhost:5601');
  console.log('[share] frontend admin: http://localhost:5500');
  console.log('[share] loja: http://localhost:5600');
  console.log('[share] proxy público local: http://localhost:5700');
  console.log('[share] backend: http://localhost:3333');
}
