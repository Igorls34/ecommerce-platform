import { LocalStorageProvider } from './providers/LocalStorageProvider';
import { StorageProvider } from './types';

export function getStorageProvider(): StorageProvider {
  const provider = String(process.env.STORAGE_PROVIDER || process.env.UPLOAD_PROVIDER || 'local')
    .trim()
    .toLowerCase();

  if (provider === 'local') {
    return new LocalStorageProvider();
  }

  throw new Error(
    `Storage provider "${provider}" não está implementado neste MVP. Use STORAGE_PROVIDER=local.`,
  );
}
