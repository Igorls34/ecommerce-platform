import { Request, Response } from 'express';

import { prisma } from '../lib/prisma';

const DEFAULT_SETTINGS = { id: 1 };

export const getStoreSettings = async (_req: Request, res: Response) => {
  try {
    const settings = await prisma.storeSettings.findUnique({
      where: { id: 1 },
    });

    return res.status(200).json(settings || DEFAULT_SETTINGS);
  } catch (error) {
    console.error('[settings] erro ao carregar:', error);
    return res.status(500).json({ error: 'Não foi possível carregar as configurações.' });
  }
};

export const updateStoreSettings = async (req: Request, res: Response) => {
  try {
    const allowed = [
      'adminOrderEmail',
      'mailFrom',
      'mailFromName',
      'storeBaseUrl',
      'adminBaseUrl',
      'senderName',
      'senderPhone',
      'senderEmail',
      'senderDocument',
      'senderAddress',
      'senderNumber',
      'senderComplement',
      'senderDistrict',
      'senderCity',
      'senderState',
      'storeZipCode',
      'storeWeight',
      'storeLength',
      'storeWidth',
      'storeHeight',
      'pixKey',
      'pixMerchantName',
      'pixMerchantCity',
      'pixProvider',
      'cardProvider',
      'companyName',
      'companyCnpj',
      'stateRegistration',
      'taxRegime',
    ];

    const data: Record<string, string | null> = {};

    for (const field of allowed) {
      if (field in req.body) {
        const value = req.body[field];
        if (typeof value === 'string') {
          const trimmed = value.trim();
          data[field] = trimmed || null;
        } else if (value === null || value === undefined) {
          data[field] = null;
        }
      }
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'Nenhum campo válido para atualizar.' });
    }

    const settings = await prisma.storeSettings.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...data },
    });

    return res.status(200).json(settings);
  } catch (error) {
    console.error('[settings] erro ao atualizar:', error);
    return res.status(500).json({ error: 'Não foi possível atualizar as configurações.' });
  }
};

export async function getSettingsValue(key: string): Promise<string | undefined> {
  try {
    const settings = await prisma.storeSettings.findUnique({ where: { id: 1 } });
    const value = settings ? (settings as Record<string, unknown>)[key] : undefined;
    return typeof value === 'string' && value ? value : undefined;
  } catch {
    return undefined;
  }
}
