import { Request, Response } from 'express';

import { uploadProductImageFile } from '../services/imageStorage';

export const uploadProductImage = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada.' });
    }

    const uploadResult = await uploadProductImageFile(req.file);

    return res.status(201).json({
      message: 'Imagem enviada com sucesso.',
      imageUrl: uploadResult.imageUrl,
      imageKey: uploadResult.imageKey,
      provider: uploadResult.provider,
      mimeType: uploadResult.mimeType,
      size: uploadResult.size,
    });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Erro ao fazer upload da imagem.';
    return res.status(500).json({ error: message });
  }
};
