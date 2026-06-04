import sharp from 'sharp';

import { getMaxUploadSizeBytes } from './storageConfig';
import { getStorageProvider } from './StorageProviderFactory';
import { UploadedFile } from './types';

const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function getImageMaxWidth() {
  return Number(process.env.IMAGE_MAX_WIDTH || 1200);
}

function getImageQuality() {
  return Number(process.env.IMAGE_WEBP_QUALITY || 80);
}

function validateImageFile(file: Express.Multer.File) {
  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
    throw new Error('Envie uma imagem JPG, PNG ou WebP.');
  }

  if (file.size > getMaxUploadSizeBytes()) {
    throw new Error(`A imagem deve ter no maximo ${process.env.MAX_UPLOAD_SIZE_MB || 5} MB.`);
  }
}

async function optimizeImage(buffer: Buffer) {
  try {
    return sharp(buffer)
      .rotate()
      .resize({
        width: getImageMaxWidth(),
        withoutEnlargement: true,
      })
      .webp({
        quality: getImageQuality(),
        effort: 5,
      })
      .toBuffer();
  } catch {
    throw new Error('Não foi possível processar a imagem enviada.');
  }
}

export async function uploadImageFile(
  file: Express.Multer.File,
  folder = 'products',
): Promise<UploadedFile> {
  validateImageFile(file);

  const provider = getStorageProvider();
  const optimizedBuffer = await optimizeImage(file.buffer);

  return provider.upload({
    buffer: optimizedBuffer,
    originalName: file.originalname,
    mimeType: 'image/webp',
    folder,
  });
}

export async function deleteStoredFile(key: string | null | undefined, providerName?: string | null) {
  if (!key || providerName !== 'local') {
    return;
  }

  const provider = getStorageProvider();

  if (provider.name !== providerName) {
    return;
  }

  await provider.delete(key);
}
