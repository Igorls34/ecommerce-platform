const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const RUNTIME_DIR = path.join(ROOT_DIR, 'share-runtime');
const RUNTIME_PIDS_PATH = path.join(RUNTIME_DIR, 'pids.json');
const SHARE_PORTS = [3333, 5500, 5600, 5601, 5700, 4040];

const targets = collectRegisteredPids();
const portTargets = collectPortPids(SHARE_PORTS);
const portTargetSet = new Set(portTargets.map(Number));
const failed = [];

for (const pid of unique([...targets, ...portTargets])) {
  try {
    stopProcessTree(pid);
    console.log(`[share] Processo encerrado: ${pid}`);
  } catch (error) {
    if (isNotFoundError(error) || !portTargetSet.has(Number(pid))) {
      console.log(`[share] Processo ja encerrado: ${pid}`);
    } else {
      failed.push(pid);
      console.log(`[share] Nao foi possivel encerrar ${pid}: ${error.message}`);
    }
  }
}

if (failed.length) {
  console.log('[share] Alguns processos não foram encerrados. Execute novamente como administrador se necessário.');
} else {
  try {
    fs.rmSync(RUNTIME_PIDS_PATH, { force: true });
  } catch {}
}

if (!targets.length && !portTargets.length) {
  console.log('[share] Nenhum processo registrado ou porta de compartilhamento ativa.');
}

function collectRegisteredPids() {
  if (!fs.existsSync(RUNTIME_PIDS_PATH)) {
    return [];
  }

  try {
    const pidState = JSON.parse(fs.readFileSync(RUNTIME_PIDS_PATH, 'utf8').replace(/^\uFEFF/, ''));
    return [
      ...(Array.isArray(pidState.children) ? pidState.children.map((item) => item.pid) : []),
      pidState.dashboardPid,
      pidState.launcherPid,
    ].filter(Boolean);
  } catch {
    return [];
  }
}

function collectPortPids(ports) {
  if (process.platform !== 'win32') {
    return [];
  }

  const pids = collectPortPidsFromNetstat(ports);

  if (pids.length) {
    return pids;
  }

  for (const port of ports) {
    try {
      const output = execFileSync(
        'powershell.exe',
        [
          '-NoProfile',
          '-Command',
          `Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess`,
        ],
        {
          encoding: 'utf8',
          windowsHide: true,
        },
      );

      for (const value of output.split(/\s+/)) {
        const pid = Number(value);

        if (pid && pid !== process.pid) {
          pids.push(pid);
        }
      }
    } catch {}
  }

  return pids;
}

function collectPortPidsFromNetstat(ports) {
  try {
    const output = execFileSync('netstat.exe', ['-ano'], {
      encoding: 'utf8',
      windowsHide: true,
    });
    const wantedPorts = new Set(ports.map(String));
    const pids = [];

    for (const line of output.split(/\r?\n/)) {
      const parts = line.trim().split(/\s+/);

      if (parts.length < 5 || parts[0] !== 'TCP') {
        continue;
      }

      const localAddress = parts[1] || '';
      const state = parts[3] || '';
      const pid = Number(parts[4]);
      const port = localAddress.match(/:(\d+)$/)?.[1];

      if (wantedPorts.has(port) && state === 'LISTENING' && pid && pid !== process.pid) {
        pids.push(pid);
      }
    }

    return pids;
  } catch {
    return [];
  }
}

function unique(values) {
  return [...new Set(values.map(Number).filter(Boolean))];
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

function isNotFoundError(error) {
  return /not found|not running|não.*encontr|nao.*encontr|inexistente/i.test(
    String(error?.message || error || ''),
  );
}
