export type StorageProviderName = 'local' | 'cloudinary' | 's3' | 'r2';

export type UploadFileInput = {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  folder?: string;
};

export type UploadedFile = {
  url: string;
  key: string;
  provider: StorageProviderName;
  mimeType: string;
  size: number;
};

export interface StorageProvider {
  name: StorageProviderName;
  upload(input: UploadFileInput): Promise<UploadedFile>;
  delete(key: string): Promise<void>;
}
