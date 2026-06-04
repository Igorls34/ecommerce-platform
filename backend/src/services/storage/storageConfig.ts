import path from 'path';

export function getUploadsDir() {
  return path.resolve(process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads'));
}

export function getPublicUploadsUrl() {
  return (process.env.PUBLIC_UPLOADS_URL || '/uploads').replace(/\/$/, '');
}

export function getMaxUploadSizeBytes() {
  const maxUploadSizeMb = Number(process.env.MAX_UPLOAD_SIZE_MB || 5);
  return Math.max(1, maxUploadSizeMb) * 1024 * 1024;
}
