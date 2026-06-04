import QRCode from 'qrcode';

const DEFAULT_PIX_KEY = '22644620783';
const DEFAULT_MERCHANT_NAME = 'THESSARA';
const DEFAULT_MERCHANT_CITY = 'SAO PAULO';

function normalizeText(value, maxLength) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 $%*+\-./:]/g, '')
    .toUpperCase()
    .slice(0, maxLength);
}

function normalizePixKey(value) {
  const key = String(value || DEFAULT_PIX_KEY).trim();

  if (/^\d{11}$/.test(key) || /^\d{14}$/.test(key)) {
    return key;
  }

  return key;
}

function normalizeAmount(value) {
  const amount = Number(value || 0);
  return Math.max(0, amount).toFixed(2);
}

function emv(id, value) {
  const normalizedValue = String(value || '');
  return `${id}${String(normalizedValue.length).padStart(2, '0')}${normalizedValue}`;
}

function crc16(payload) {
  let crc = 0xffff;

  for (let index = 0; index < payload.length; index += 1) {
    crc ^= payload.charCodeAt(index) << 8;

    for (let bit = 0; bit < 8; bit += 1) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }

      crc &= 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function buildPixPayload({ amount, description, pixKey, merchantCity, merchantName }) {
  // Gera BR Code PIX estatico conforme padrao EMV. Este QR e util como fallback/local,
  // mas em pagamento real a confirmacao deve vir do gateway.
  const key = normalizePixKey(pixKey);
  const name = normalizeText(merchantName || DEFAULT_MERCHANT_NAME, 25);
  const city = normalizeText(merchantCity || DEFAULT_MERCHANT_CITY, 15);
  const txid = normalizeText(description || '***', 25) || '***';
  const merchantAccount = [emv('00', 'BR.GOV.BCB.PIX'), emv('01', key)].join('');

  const payloadWithoutCrc = [
    emv('00', '01'),
    emv('26', merchantAccount),
    emv('52', '0000'),
    emv('53', '986'),
    emv('54', normalizeAmount(amount)),
    emv('58', 'BR'),
    emv('59', name),
    emv('60', city),
    emv('62', emv('05', txid)),
    '6304',
  ].join('');

  return `${payloadWithoutCrc}${crc16(payloadWithoutCrc)}`;
}

export async function createPixQrCode(payload) {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 1,
    scale: 7,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });
}

export function getPixConfig() {
  return {
    pixKey: import.meta.env.VITE_PIX_KEY || DEFAULT_PIX_KEY,
    merchantName: import.meta.env.VITE_PIX_MERCHANT_NAME || DEFAULT_MERCHANT_NAME,
    merchantCity: import.meta.env.VITE_PIX_MERCHANT_CITY || DEFAULT_MERCHANT_CITY,
  };
}
