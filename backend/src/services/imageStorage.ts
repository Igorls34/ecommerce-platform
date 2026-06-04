import { uploadImageFile } from './storage/ImageStorageService';

export async function uploadProductImageFile(file: Express.Multer.File, folder = 'products') {
  const uploadedFile = await uploadImageFile(file, folder);

  return {
    imageUrl: uploadedFile.url,
    imageKey: uploadedFile.key,
    provider: uploadedFile.provider,
    mimeType: uploadedFile.mimeType,
    size: uploadedFile.size,
  };
}
