import {
  InvalidWebhookSignatureError,
  MercadoPagoConfig,
  Order,
  Payment,
  WebhookSignatureValidator,
} from 'mercadopago';

export type MercadoPagoPayment = Record<string, any>;
export type MercadoPagoOrder = Record<string, any>;

export function onlyDigits(value: string | null | undefined) {
  return String(value || '').replace(/\D/g, '');
}

export function splitName(fullName: string) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);

  if (!parts.length) {
    return { firstName: undefined, lastName: undefined };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ') || undefined,
  };
}

export function getPayerIdentification(cpf?: string | null) {
  const doc = onlyDigits(cpf);

  if (!doc) {
    return undefined;
  }

  return {
    type: doc.length > 11 ? 'CNPJ' : 'CPF' as const,
    number: doc,
  };
}

export function getPayerEmail(email: string) {
  const customerEmail = String(email || '').trim();
  if (!customerEmail) return 'cliente@exemplo.com.br';
  return customerEmail;
}

export function getExpirationDate(minutes?: number) {
  const expirationMinutes = minutes || Number(process.env.MERCADO_PAGO_PIX_EXPIRATION_MINUTES || 30);
  return new Date(Date.now() + Math.max(1, expirationMinutes) * 60 * 1000);
}

export function getExpirationMinutes() {
  return Math.max(1, Number(process.env.MERCADO_PAGO_PIX_EXPIRATION_MINUTES || 30));
}

export function mapMercadoPagoStatus(status: string | undefined) {
  if (status === 'approved') {
    return 'paid';
  }

  if (['rejected', 'cancelled', 'refunded', 'charged_back'].includes(String(status))) {
    return 'failed';
  }

  return 'pending';
}

export function getNotificationUrl() {
  const value = String(
    process.env.MERCADO_PAGO_NOTIFICATION_URL || process.env.MERCADO_PAGO_WEBHOOK_URL || '',
  ).trim();

  if (!value) {
    return '';
  }

  try {
    const url = new URL(value);
    const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);

    if (isLocalhost) {
      console.warn(
        '[mercado-pago] notification_url local ignorada. Use ngrok/Cloudflare Tunnel ou URL publica em testes de webhook.',
      );
      return '';
    }

    return value;
  } catch {
    console.warn('[mercado-pago] notification_url invalida ignorada.');
    return '';
  }
}

export function createMercadoPagoClient() {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || '';

  if (!accessToken || accessToken.includes('xxxxx')) {
    throw new Error('Mercado Pago exige MERCADO_PAGO_ACCESS_TOKEN configurado.');
  }

  return new MercadoPagoConfig({ accessToken });
}

export function createPaymentClient() {
  return new Payment(createMercadoPagoClient());
}

export function createOrderClient() {
  return new Order(createMercadoPagoClient());
}

export function extractMercadoPagoError(error: unknown, defaultMessage = 'Erro no Mercado Pago.') {
  if (!error || typeof error !== 'object') {
    return error instanceof Error ? error.message : defaultMessage;
  }

  const payload = error as Record<string, any>;
  const sdkErrors = Array.isArray(payload.errors)
    ? payload.errors
        .map((item) => {
          const message = [item?.code, item?.message, ...(item?.details || [])]
            .filter(Boolean)
            .join(': ');
          return message;
        })
        .filter(Boolean)
        .join(' | ')
    : '';
  const candidates = [
    payload.message,
    payload.error,
    payload.cause?.message,
    payload.cause?.[0]?.description,
    payload.cause?.[0]?.message,
    payload.status_detail,
  ];

  const details = Array.isArray(payload.cause)
    ? payload.cause
        .map((item) => item?.description || item?.message || item?.code)
        .filter(Boolean)
      .join(' | ')
    : '';
  const message = candidates.find((candidate) => typeof candidate === 'string' && candidate.trim());

  return [message, details, sdkErrors].filter(Boolean).join(' | ') || defaultMessage;
}

export function getOrderPayment(order: MercadoPagoOrder) {
  return order?.transactions?.payments?.[0] || {};
}

export function getPixData(payment: MercadoPagoPayment) {
  const transactionData = payment?.point_of_interaction?.transaction_data || {};
  const orderPaymentMethod = payment?.transactions?.payments?.[0]?.payment_method || {};

  return {
    qrCode: String(transactionData.qr_code || orderPaymentMethod.qr_code || ''),
    qrCodeBase64: transactionData.qr_code_base64 || orderPaymentMethod.qr_code_base64
      ? `data:image/png;base64,${transactionData.qr_code_base64 || orderPaymentMethod.qr_code_base64}`
      : '',
    ticketUrl: String(transactionData.ticket_url || orderPaymentMethod.ticket_url || ''),
  };
}

export function verifyMercadoPagoWebhookSignature({
  signatureHeader,
  requestId,
  dataId,
}: {
  signatureHeader: string | string[] | undefined;
  requestId: string | string[] | undefined;
  dataId: string | string[] | undefined;
}) {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET || '';

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Mercado Pago webhook secret não configurado.');
    }

    console.warn(
      '[mercado-pago-webhook] recebido sem validação de assinatura porque MERCADO_PAGO_WEBHOOK_SECRET nao esta configurado. Não usar assim em produção.',
    );
    return;
  }

  try {
    WebhookSignatureValidator.validate({
      xSignature: signatureHeader,
      xRequestId: requestId,
      dataId,
      secret,
      toleranceSeconds: 300,
    });
  } catch (error) {
    if (error instanceof InvalidWebhookSignatureError) {
      console.warn('[mercado-pago-webhook] assinatura invalida:', {
        reason: error.reason,
        requestId: error.requestId,
      });
    }

    throw error;
  }
}

export async function getMercadoPagoPayment(paymentId: string) {
  const payment = createPaymentClient();

  try {
    return await payment.get({ id: paymentId });
  } catch {
    const order = createOrderClient();
    return order.get({ id: paymentId });
  }
}
