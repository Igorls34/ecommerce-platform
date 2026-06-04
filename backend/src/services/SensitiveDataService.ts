import crypto from 'crypto';

const CPF_PREFIX = 'enc:v1:';
const SECRET_PREFIX = 'secret:v1:';

function onlyDigits(value: unknown) {
  return String(value || '').replace(/\D/g, '');
}

function getEncryptionKey() {
  const rawKey = process.env.ENCRYPTION_KEY || '';

  if (!rawKey) {
    return null;
  }

  if (/^[a-f0-9]{64}$/i.test(rawKey)) {
    return Buffer.from(rawKey, 'hex');
  }

  return crypto.createHash('sha256').update(rawKey).digest();
}

function encryptValue(value: unknown, prefix: string) {
  const normalizedValue = String(value || '');

  if (!normalizedValue) {
    return null;
  }

  const key = getEncryptionKey();

  if (!key) {
    return null;
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(normalizedValue, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${prefix}${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

function decryptValue(encryptedValue: unknown, prefix: string) {
  const value = String(encryptedValue || '');

  if (!value.startsWith(prefix)) {
    return value;
  }

  const key = getEncryptionKey();

  if (!key) {
    return '';
  }

  const [ivValue, authTagValue, payloadValue] = value.slice(prefix.length).split(':');

  if (!ivValue || !authTagValue || !payloadValue) {
    return '';
  }

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivValue, 'base64'));
  decipher.setAuthTag(Buffer.from(authTagValue, 'base64'));

  return Buffer.concat([
    decipher.update(Buffer.from(payloadValue, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

export function encryptCpf(cpf: unknown) {
  const normalizedCpf = onlyDigits(cpf);

  if (!normalizedCpf) {
    return null;
  }

  // AES-256-GCM entrega confidencialidade e autenticidade: se o valor for alterado no banco,
  // a descriptografia falha em vez de retornar dado corrompido.
  return encryptValue(normalizedCpf, CPF_PREFIX);
}

export function decryptCpf(encryptedCpf: unknown) {
  const value = String(encryptedCpf || '');

  if (!value.startsWith(CPF_PREFIX)) {
    return onlyDigits(value);
  }

  return decryptValue(value, CPF_PREFIX);
}

export function encryptSecret(value: unknown) {
  return encryptValue(value, SECRET_PREFIX);
}

export function decryptSecret(value: unknown) {
  return decryptValue(value, SECRET_PREFIX);
}
