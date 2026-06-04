import {
  CreateTransactionInput,
  GatewayStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentTransaction,
} from '../types';

const PIX_KEY = process.env.PIX_KEY || process.env.VITE_PIX_KEY || '00000000000';
const PIX_MERCHANT_NAME = process.env.PIX_MERCHANT_NAME || 'MINHA LOJA';
const PIX_MERCHANT_CITY = process.env.PIX_MERCHANT_CITY || 'MINHA CIDADE';

function normalizeText(value: string, maxLength: number) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 $%*+\-./:]/g, '')
    .toUpperCase()
    .slice(0, maxLength);
}

function emv(id: string, value: string) {
  return `${id}${String(value.length).padStart(2, '0')}${value}`;
}

function crc16(payload: string) {
  let crc = 0xffff;

  for (let index = 0; index < payload.length; index += 1) {
    crc ^= payload.charCodeAt(index) << 8;

    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) !== 0 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function buildLocalPixPayload(amount: number, orderId: number) {
  // BR Code local/manual: gera QR Code e copia-e-cola, mas nao confirma pagamento sozinho.
  const merchantAccount = [emv('00', 'BR.GOV.BCB.PIX'), emv('01', PIX_KEY)].join('');
  const txid = normalizeText(`PEDIDO${orderId}`, 25);
  const payloadWithoutCrc = [
    emv('00', '01'),
    emv('26', merchantAccount),
    emv('52', '0000'),
    emv('53', '986'),
    emv('54', Math.max(0, amount).toFixed(2)),
    emv('58', 'BR'),
    emv('59', normalizeText(PIX_MERCHANT_NAME, 25)),
    emv('60', normalizeText(PIX_MERCHANT_CITY, 15)),
    emv('62', emv('05', txid)),
    '6304',
  ].join('');

  return `${payloadWithoutCrc}${crc16(payloadWithoutCrc)}`;
}

export class LocalPixPaymentProvider implements PaymentProvider {
  name = 'local';
  supportedMethods: PaymentMethod[] = ['pix'];

  async createTransaction(orderData: CreateTransactionInput): Promise<PaymentTransaction> {
    if (orderData.paymentMethod !== 'pix') {
      throw new Error('Provedor local suporta apenas PIX.');
    }

    const pixCopyPaste = buildLocalPixPayload(orderData.total, orderData.orderId);
    const expiresAt = new Date(
      Date.now() + Number(process.env.LOCAL_PIX_EXPIRES_AFTER_SECONDS || 1800) * 1000,
    ).toISOString();

    return {
      provider: this.name,
      paymentMethod: 'pix',
      gatewayOrderId: `local-order-${orderData.orderId}`,
      gatewayChargeId: `local-charge-${orderData.orderId}`,
      status: 'pending',
      qrCode: pixCopyPaste,
      pixCopyPaste,
      paymentReference: pixCopyPaste,
      paymentStatusDetail: 'pending_local',
      expiresAt,
    };
  }

  async getTransactionStatus(): Promise<GatewayStatus> {
    return { status: 'pending' };
  }
}
