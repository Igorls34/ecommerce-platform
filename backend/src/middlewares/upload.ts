import multer from 'multer';

import { getMaxUploadSizeBytes } from '../services/storage/storageConfig';

const storage = multer.memoryStorage();
const allowedImageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

function imageFileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback,
) {
  if (allowedImageMimeTypes.has(file.mimetype)) {
    callback(null, true);
    return;
  }

  callback(new Error('Envie uma imagem JPG, PNG ou WebP.'));
}

export const upload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: getMaxUploadSizeBytes(),
  },
});
