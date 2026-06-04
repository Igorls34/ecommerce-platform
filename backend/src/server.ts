import 'dotenv/config';

import { createApp } from './app';
import { melhorEnvioAuthService } from './services/MelhorEnvioAuthService';
import { ensureDefaultAdminUser, ensureDefaultCategory } from './services/adminBootstrap';

const app = createApp();

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('JWT_SECRET precisa estar definido em produção. Abortando inicialização.');
  process.exit(1);
}

const PORT = process.env.PORT || 3333;

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason instanceof Error ? reason.stack : String(reason));
});

process.on('uncaughtException', (error) => {
  console.error('[uncaughtException]', error.stack || error.message);
  process.exit(1);
});

export async function startServer() {
  await ensureDefaultAdminUser();
  await ensureDefaultCategory();
  melhorEnvioAuthService.startScheduler();

  return app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Erro ao iniciar o servidor:', error);
    process.exit(1);
  });
}

export { app };
