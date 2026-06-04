const { spawn } = require('child_process');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend-admin');
const isWindows = process.platform === 'win32';
const command = isWindows ? 'cmd.exe' : 'npm';
const args = isWindows
  ? ['/c', 'npm.cmd', 'run', 'dev', '--', '--host', '127.0.0.1', '--port', '5500']
  : ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '5500'];

const frontendProcess = spawn(command, args, {
  cwd: FRONTEND_DIR,
  stdio: 'inherit',
  shell: false,
});

frontendProcess.on('exit', (code) => {
  process.exit(code || 0);
});

frontendProcess.on('error', (error) => {
  console.error('[frontend-admin] falha ao iniciar servidor vite:', error);
  process.exit(1);
});
