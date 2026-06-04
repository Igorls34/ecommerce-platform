import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5500,
    allowedHosts: true,
    proxy: {
      '/admin': {
        target: 'http://127.0.0.1:3333',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:3333',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './vitest.setup.js',
    include: ['src/**/*.test.{js,jsx}'],
  },
});
