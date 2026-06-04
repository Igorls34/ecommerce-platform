import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import multer from 'multer';
import path from 'path';

import { adminRoutes } from './routes/admin/routes';
import { honeypotRoutes } from './routes/admin/honeypot';
import { stripeWebhookRoutes } from './routes/payment/stripeWebhook';
import { storeRoutes } from './routes/store/routes';
import { getUploadsDir } from './services/storage/storageConfig';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://sdk.mercadopago.com"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          connectSrc: ["'self'", "https://api.mercadopago.com", "https://viacep.com.br"],
          frameSrc: ["'self'", "https://sdk.mercadopago.com"],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(cors());
  app.use('/webhook', express.raw({ type: 'application/json' }), stripeWebhookRoutes);
  app.use(express.json());
  app.use(
    '/uploads',
    express.static(path.resolve(getUploadsDir()), {
      immutable: true,
      maxAge: '30d',
    }),
  );

  // Honeypot - rotas de armadilha para detectar acessos nao autorizados
  // Ativar com HONEYPOT_ENABLED=true no .env quando o site for para producao
  app.use(honeypotRoutes());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
  });

  app.use('/store', storeRoutes);
  app.use('/admin', adminRoutes);

  app.use(
    (error: Error, _req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            error: `A imagem deve ter no maximo ${process.env.MAX_UPLOAD_SIZE_MB || 5} MB.`,
          });
        }

        return res.status(400).json({ error: error.message });
      }

      if (
        error.message === 'Apenas imagens sao permitidas.' ||
        error.message === 'Envie uma imagem JPG, PNG ou WebP.'
      ) {
        return res.status(400).json({ error: error.message });
      }

      return next(error);
    },
  );

  return app;
}
