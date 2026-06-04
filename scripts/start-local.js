const path = require('path');
const { spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const BACKEND_DIR = path.join(ROOT_DIR, 'backend');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend-admin');
const isWindows = process.platform === 'win32';
const shellCommand = isWindows ? 'cmd.exe' : 'npm';

function startProcess(cwd, label, args) {
  const childProcess = spawn(shellCommand, args, {
    cwd,
    stdio: 'inherit',
    shell: false,
  });

  childProcess.on('exit', (code) => {
    console.log(`\n[${label}] processo encerrado com codigo ${code}`);
  });

  childProcess.on('error', (error) => {
    console.error(`\n[${label}] nao foi possivel iniciar:`, error);
  });

  return childProcess;
}

const backendArgs = isWindows ? ['/c', 'npm.cmd', 'run', 'dev'] : ['run', 'dev'];
const frontendArgs = isWindows
  ? ['/c', 'npm.cmd', 'run', 'dev', '--', '--host', '0.0.0.0', '--port', '5500']
  : ['run', 'dev', '--', '--host', '0.0.0.0', '--port', '5500'];

const backendProcess = startProcess(BACKEND_DIR, 'backend', backendArgs);
const frontendProcess = startProcess(FRONTEND_DIR, 'frontend', frontendArgs);

console.log('[frontend] iniciando em http://localhost:5500');
console.log('[backend] iniciando em http://localhost:3333');
console.log('\nUse Ctrl+C para encerrar tudo.\n');

function shutdown() {
  if (frontendProcess && !frontendProcess.killed) {
    frontendProcess.kill();
  }

  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill();
  }

  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
