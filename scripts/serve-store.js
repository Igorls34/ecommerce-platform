const { spawn } = require('child_process');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const STORE_DIR = path.join(ROOT_DIR, 'frontend-store');
const isWindows = process.platform === 'win32';
const command = isWindows ? 'cmd.exe' : 'npm';
const args = isWindows
  ? ['/c', 'npm.cmd', 'run', 'dev', '--', '--host', '127.0.0.1', '--port', '5600']
  : ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '5600'];

const storeProcess = spawn(command, args, {
  cwd: STORE_DIR,
  stdio: 'inherit',
  shell: false,
});

storeProcess.on('exit', (code) => {
  process.exit(code || 0);
});

storeProcess.on('error', (error) => {
  console.error('[frontend-store] falha ao iniciar servidor vite:', error);
  process.exit(1);
});
