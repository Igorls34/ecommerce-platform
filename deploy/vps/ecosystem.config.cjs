module.exports = {
  apps: [
    {
      name: 'thessara-api',
      cwd: '/var/www/thessara/backend',
      script: 'dist/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: '3333',
      },
      max_memory_restart: '300M',
    },
  ],
};
