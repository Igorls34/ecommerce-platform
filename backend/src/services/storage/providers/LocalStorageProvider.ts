import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

import { getPublicUploadsUrl, getUploadsDir } from '../storageConfig';
import { StorageProvider, UploadedFile, UploadFileInput } from '../types';

function normalizeFolder(value: string | undefined) {
  return String(value || '')
    .replace(/\\/g, '/')
    .split('/')
    .map((part) => part.trim().replace(/[^a-zA-Z0-9_-]/g, ''))
    .filter(Boolean)
    .join('/');
}

function normalizeKey(value: string | undefined) {
  return String(value || '')
    .replace(/\\/g, '/')
    .split('/')
    .map((part) => part.trim().replace(/[^a-zA-Z0-9_.-]/g, ''))
    .filter(Boolean)
    .join('/');
}

function buildExtension(mimeType: string) {
  if (mimeType === 'image/webp') {
    return '.webp';
  }

  if (mimeType === 'image/png') {
    return '.png';
  }

  return '.bin';
}

export class LocalStorageProvider implements StorageProvider {
  name = 'local' as const;

  async upload(input: UploadFileInput): Promise<UploadedFile> {
    const folder = normalizeFolder(input.folder);
    const uploadsDir = getUploadsDir();
    const targetDir = path.join(uploadsDir, folder);
    const filename = `${randomUUID()}${buildExtension(input.mimeType)}`;
    const key = folder ? `${folder}/${filename}` : filename;
    const targetPath = path.join(uploadsDir, key);

    await fs.mkdir(targetDir, { recursive: true });
    await fs.writeFile(targetPath, input.buffer);

    return {
      url: `${getPublicUploadsUrl()}/${key.replace(/\\/g, '/')}`,
      key,
      provider: this.name,
      mimeType: input.mimeType,
      size: input.buffer.length,
    };
  }

  async delete(key: string): Promise<void> {
    const normalizedKey = normalizeKey(key);

    if (!normalizedKey) {
      return;
    }

    const uploadsDir = getUploadsDir();
    const targetPath = path.resolve(uploadsDir, normalizedKey);

    if (!targetPath.startsWith(path.resolve(uploadsDir))) {
      return;
    }

    await fs.unlink(targetPath).catch(() => undefined);
  }
}
