# Storage providers

Camada simples de storage para uploads do MVP.

## Fluxo atual

- `STORAGE_PROVIDER=local`
- Imagens chegam pelo `multer.memoryStorage()`.
- `ImageStorageService` valida MIME/tamanho, converte para WebP com `sharp` e chama o provider.
- `LocalStorageProvider` salva em `UPLOADS_DIR`, usando subpasta `products`.
- O backend serve os arquivos em `/uploads`.

## Variaveis

```env
STORAGE_PROVIDER=local
UPLOADS_DIR=uploads
PUBLIC_UPLOADS_URL=http://localhost:3333/uploads
MAX_UPLOAD_SIZE_MB=5
IMAGE_MAX_WIDTH=1200
IMAGE_WEBP_QUALITY=80
```

## Como adicionar outro provider

1. Crie um provider em `providers/` implementando `StorageProvider`.
2. Adicione a selecao em `StorageProviderFactory`.
3. Retorne sempre `url`, `key`, `provider`, `mimeType` e `size`.
4. Implemente `delete(key)` para permitir troca/remocao segura da imagem.

Para producao com storage local, configure o Nginx para servir `/uploads` apontando para `UPLOADS_DIR`.
