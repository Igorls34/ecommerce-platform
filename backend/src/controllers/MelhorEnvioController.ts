import { Request, Response } from 'express';

import { MelhorEnvioApiError, MelhorEnvioLabelService } from '../services/MelhorEnvioLabelService';

const melhorEnvioLabelService = new MelhorEnvioLabelService();

function parseCurrencyValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.');
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function findBalanceValue(payload: unknown): number | null {
  const directValue = parseCurrencyValue(payload);

  if (directValue !== null) {
    return directValue;
  }

  if (!payload || typeof payload !== 'object') {
    return null;
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const result = findBalanceValue(item);

      if (result !== null) {
        return result;
      }
    }

    return null;
  }

  const record = payload as Record<string, unknown>;
  const preferredKeys = ['balance', 'saldo', 'amount', 'value', 'available', 'available_balance'];

  for (const key of preferredKeys) {
    if (key in record) {
      const result = findBalanceValue(record[key]);

      if (result !== null) {
        return result;
      }
    }
  }

  return null;
}

function pickString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }

  return '';
}

function onlyDigits(value: unknown) {
  return String(value || '').replace(/\D/g, '');
}

function maskDocument(value: unknown) {
  const digits = onlyDigits(value);

  if (digits.length <= 4) {
    return digits || '';
  }

  return `${'*'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

function maskEmail(value: unknown) {
  const email = String(value || '');

  if (!email.includes('@')) {
    return email;
  }

  const [name, domain] = email.split('@');
  return `${name.slice(0, 2)}${'*'.repeat(Math.max(2, name.length - 2))}@${domain}`;
}

function getMelhorEnvioEnvironment() {
  const apiUrl = String(process.env.MELHOR_ENVIO_API_URL || '');

  if (apiUrl.includes('sandbox')) {
    return 'sandbox';
  }

  if (apiUrl.includes('melhorenvio.com.br')) {
    return 'producao';
  }

  return 'desconhecido';
}

function normalizeAccount(payload: unknown) {
  const record = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  const firstname = pickString(record, ['firstname', 'first_name']);
  const lastname = pickString(record, ['lastname', 'last_name']);
  const name =
    pickString(record, ['name', 'fullname', 'full_name', 'company_name']) ||
    [firstname, lastname].filter(Boolean).join(' ');
  const email = pickString(record, ['email', 'contact_email']);
  const document = pickString(record, ['document', 'cpf', 'cnpj', 'company_document']);
  const id = pickString(record, ['id', 'uid', 'uuid']);

  return {
    id: id || null,
    name: name || null,
    email: email ? maskEmail(email) : null,
    document: document ? maskDocument(document) : null,
    environment: getMelhorEnvioEnvironment(),
  };
}

export const getMelhorEnvioBalance = async (_req: Request, res: Response) => {
  try {
    const payload = await melhorEnvioLabelService.getBalance();
    const balance = findBalanceValue(payload);

    return res.status(200).json({
      balance,
      raw: payload,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(error);

    if (error instanceof MelhorEnvioApiError) {
      return res.status(400).json({
        error: error.message,
        code: error.code,
        details: error.details,
      });
    }

    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Erro ao consultar saldo do Melhor Envio.',
      code: 'MELHOR_ENVIO_API',
    });
  }
};

export const getMelhorEnvioAccount = async (_req: Request, res: Response) => {
  try {
    const payload = await melhorEnvioLabelService.getAccount();

    return res.status(200).json({
      account: normalizeAccount(payload),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(error);

    if (error instanceof MelhorEnvioApiError) {
      return res.status(400).json({
        error: error.message,
        code: error.code,
        details: error.details,
      });
    }

    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'Erro ao consultar conta conectada do Melhor Envio.',
      code: 'MELHOR_ENVIO_API',
    });
  }
};
