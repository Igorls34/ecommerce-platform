import {
  CreateTransactionInput,
  GatewayStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentTransaction,
} from '../types';

import {
  createMercadoPagoClient,
  createOrderClient,
  createPaymentClient,
  extractMercadoPagoError,
  getExpirationDate,
  getExpirationMinutes,
  getNotificationUrl,
  getOrderPayment,
  getPayerEmail,
  getPixData,
  mapMercadoPagoStatus,
  MercadoPagoOrder,
  MercadoPagoPayment,
  onlyDigits,
  splitName,
  verifyMercadoPagoWebhookSignature,
} from './mercadoPagoUtils';
import { brand } from '../../../lib/brand';

export class MercadoPagoPixPaymentProvider implements PaymentProvider {
  name = 'mercado_pago';
  supportedMethods: PaymentMethod[] = ['pix'];

  hasCredentials() {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || '';
    return Boolean(accessToken && !accessToken.includes('xxxxx'));
  }

  private getClient() {
    if (!this.hasCredentials()) {
      throw new Error('Pagamento PIX com Mercado Pago exige MERCADO_PAGO_ACCESS_TOKEN configurado.');
    }

    return createMercadoPagoClient();
  }

  private getPaymentClient() {
    return createPaymentClient();
  }

  private getOrderClient() {
    return createOrderClient();
  }

  async createTransaction(orderData: CreateTransactionInput): Promise<PaymentTransaction> {
    if (orderData.paymentMethod !== 'pix') {
      throw new Error('Provedor Mercado Pago configurado neste sistema suporta apenas PIX.');
    }

    if (!Number.isFinite(Number(orderData.total)) || Number(orderData.total) <= 0) {
      throw new Error('Mercado Pago exige valor total maior que zero para gerar PIX.');
    }

    const order = this.getOrderClient();
    const { firstName, lastName } = splitName(orderData.customer.name);
    const customerDocument = onlyDigits(orderData.customer.cpf);
    const expiresAt = getExpirationDate();
    const notificationUrl = getNotificationUrl();
    const body: Record<string, unknown> = {
      type: 'online',
      total_amount: Number(orderData.total).toFixed(2),
      description: `${brand.payment.descriptionPrefix} ${brand.name} #${orderData.orderId}`,
      currency: 'BRL',
      external_reference: String(orderData.orderId),
      processing_mode: 'automatic',
      expiration_time: `PT${getExpirationMinutes()}M`,
      payer: {
        email: getPayerEmail(orderData.customer.email),
        first_name: firstName,
        last_name: lastName,
        ...(customerDocument
          ? {
              identification: {
                type: customerDocument.length > 11 ? 'CNPJ' : 'CPF',
                number: customerDocument,
              },
            }
          : {}),
      },
      transactions: {
        payments: [
          {
            amount: Number(orderData.total).toFixed(2),
            expiration_time: `PT${getExpirationMinutes()}M`,
            payment_method: {
              id: 'pix',
              type: 'bank_transfer',
            },
          },
        ],
      },
      ...(notificationUrl
        ? {
            config: {
              online: {
                callback_url: notificationUrl,
              },
            },
          }
        : {}),
    };

    try {
      const response = await order.create({
        body: body as any,
        requestOptions: {
          idempotencyKey: `order-${orderData.orderId}-pix-mercado-pago`,
        },
      });
      const pixData = getPixData(response as MercadoPagoPayment);
      const providerOrderId = String(response.id || '');
      const providerPaymentId = String(getOrderPayment(response as MercadoPagoOrder).id || response.id || '');
      const paymentStatus = String(getOrderPayment(response as MercadoPagoOrder).status || response.status || '');
      const paymentStatusDetail = String(
        getOrderPayment(response as MercadoPagoOrder).status_detail ||
          response.status_detail ||
          paymentStatus ||
          'pending',
      );

      if (!providerOrderId) {
        throw new Error('Mercado Pago não retornou ID da order PIX.');
      }

      if (!pixData.qrCode && !pixData.qrCodeBase64) {
        throw new Error('Mercado Pago criou a order, mas não retornou QR Code PIX.');
      }

      console.log('[mercado-pago-payment] pix criado:', {
        orderId: orderData.orderId,
        mercadoPagoOrderId: providerOrderId,
        paymentId: providerPaymentId,
        status: paymentStatus || response.status,
      });

      return {
        provider: this.name,
        paymentMethod: 'pix',
        gatewayOrderId: providerOrderId,
        gatewayChargeId: providerPaymentId,
        status: mapMercadoPagoStatus(paymentStatus || response.status),
        qrCode: pixData.qrCodeBase64 || pixData.qrCode,
        qrCodeBase64: pixData.qrCodeBase64 || null,
        pixCopyPaste: pixData.qrCode,
        ticketUrl: pixData.ticketUrl || null,
        paymentReference: pixData.qrCode || providerPaymentId,
        paymentStatusDetail,
        expiresAt: getOrderPayment(response as MercadoPagoOrder).date_of_expiration || expiresAt.toISOString(),
        paidAt: paymentStatus === 'approved' ? new Date().toISOString() : undefined,
      };
    } catch (error) {
      const message = extractMercadoPagoError(error, 'Erro ao criar PIX Mercado Pago.');
      console.error('[mercado-pago-payment] falha ao criar pix:', {
        orderId: orderData.orderId,
        message,
      });
      throw new Error(message);
    }
  }

  async getTransactionStatus(paymentId: string): Promise<GatewayStatus> {
    const response = (await this.getPayment(paymentId)) as MercadoPagoPayment;
    const payment = getOrderPayment(response as MercadoPagoOrder);
    const status = String(payment.status || response.status || '');

    return {
      status: mapMercadoPagoStatus(status),
      paidAt: status === 'approved'
        ? payment.date_approved || response.date_approved || new Date().toISOString()
        : undefined,
      failureCode: payment.status_detail || response.status_detail || undefined,
      statusDetail: status || undefined,
      expiresAt: payment.date_of_expiration || response.date_of_expiration || undefined,
    };
  }

  async getPayment(paymentId: string) {
    const payment = this.getPaymentClient();

    try {
      return await payment.get({ id: paymentId });
    } catch {
      const order = this.getOrderClient();
      return order.get({ id: paymentId });
    }
  }

  verifyWebhookSignature({
    signatureHeader,
    requestId,
    dataId,
  }: {
    signatureHeader: string | string[] | undefined;
    requestId: string | string[] | undefined;
    dataId: string | string[] | undefined;
  }) {
    verifyMercadoPagoWebhookSignature({ signatureHeader, requestId, dataId });
  }
}

export function mapMercadoPagoPaymentStatus(status: string | undefined) {
  return mapMercadoPagoStatus(status);
}
