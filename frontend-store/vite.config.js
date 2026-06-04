import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const rootPublicAssets = {
  '/apple-touch-icon.svg': 'image/svg+xml',
  '/favicon.ico': 'image/png',
  '/favicon.svg': 'image/svg+xml',
  '/site.webmanifest': 'application/manifest+json',
  '/favicon.png': 'image/png',
};

export default defineConfig({
  plugins: [react(), serveRootPublicAssets()],
  server: {
    host: '0.0.0.0',
    port: 5600,
    allowedHosts: true,
    proxy: {
      '/store': {
        target: 'http://127.0.0.1:3333',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:3333',
        changeOrigin: true,
      },
    },
  },
});

function serveRootPublicAssets() {
  return {
    name: 'serve-root-public-assets',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = req.url?.split('?')[0] || '';
        const contentType = rootPublicAssets[pathname];

        if (!contentType) {
          next();
          return;
        }

        try {
          const content = await readFile(resolve(process.cwd(), 'public', pathname.slice(1)));
          res.setHeader('Content-Type', contentType);
          res.end(content);
        } catch {
          next();
        }
      });
    },
  };
}
