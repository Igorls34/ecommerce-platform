import {
  CreateTransactionInput,
  GatewayStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentTransaction,
} from '../types';

import {
  createOrderClient,
  createPaymentClient,
  extractMercadoPagoError,
  getNotificationUrl,
  getOrderPayment,
  getPayerEmail,
  getPayerIdentification,
  mapMercadoPagoStatus,
  MercadoPagoOrder,
  splitName,
} from './mercadoPagoUtils';
import { brand } from '../../../lib/brand';

const CARD_NETWORKS = ['visa', 'master', 'amex', 'hipercard', 'diners', 'elo', 'hiper', 'discover'];

function normalizeCardNetworkId(networkId: string | undefined | null) {
  const value = String(networkId || '').trim().toLowerCase();

  if (CARD_NETWORKS.includes(value)) {
    return value;
  }

  return undefined;
}

export class MercadoPagoCardPaymentProvider implements PaymentProvider {
  name = 'mercado_pago';
  supportedMethods: PaymentMethod[] = ['card'];

  hasCredentials() {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || '';
    return Boolean(accessToken && !accessToken.includes('xxxxx'));
  }

  async createTransaction(orderData: CreateTransactionInput): Promise<PaymentTransaction> {
    if (orderData.paymentMethod !== 'card') {
      throw new Error('Provedor Mercado Pago configurado neste sistema suporta apenas cartao.');
    }

    if (!Number.isFinite(Number(orderData.total)) || Number(orderData.total) <= 0) {
      throw new Error('Mercado Pago exige valor total maior que zero para processar cartao.');
    }

    if (!orderData.cardToken) {
      throw new Error(
        'Token do cartao nao informado. O cartao deve ser tokenizado pelo Mercado Pago Secure Fields no frontend.',
      );
    }

    const networkId = normalizeCardNetworkId(orderData.cardNetworkId);

    if (!networkId) {
      throw new Error(
        `Bandeira do cartao invalida ou nao informada: "${orderData.cardNetworkId}". Informe uma bandeira suportada: ${CARD_NETWORKS.join(', ')}.`,
      );
    }

    const order = createOrderClient();
    const { firstName, lastName } = splitName(orderData.customer.name);
    const notificationUrl = getNotificationUrl();

    const body: Record<string, unknown> = {
      type: 'online',
      total_amount: Number(orderData.total).toFixed(2),
      description: `${brand.payment.descriptionPrefix} ${brand.name} #${orderData.orderId}`,
      currency: 'BRL',
      external_reference: String(orderData.orderId),
      processing_mode: 'automatic',
      payer: {
        email: getPayerEmail(orderData.customer.email),
        first_name: firstName,
        last_name: lastName,
        identification: getPayerIdentification(orderData.customer.cpf),
      },
      transactions: {
        payments: [
          {
            amount: Number(orderData.total).toFixed(2),
            payment_method: {
              id: networkId,
              type: 'credit_card',
              token: orderData.cardToken,
            },
            ...(orderData.customer.cpf
              ? {
                  payer: {
                    email: getPayerEmail(orderData.customer.email),
                    first_name: firstName,
                    last_name: lastName,
                    identification: getPayerIdentification(orderData.customer.cpf),
                  },
                }
              : {}),
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
          idempotencyKey: `order-${orderData.orderId}-card-mercado-pago`,
        },
      });

      const providerOrderId = String(response.id || '');
      const payment = getOrderPayment(response as MercadoPagoOrder);
      const providerPaymentId = String(payment.id || response.id || '');
      const paymentStatus = String(payment.status || response.status || '');
      const paymentStatusDetail = String(
        payment.status_detail || response.status_detail || paymentStatus || 'pending',
      );

      if (!providerOrderId) {
        throw new Error('Mercado Pago não retornou ID da order de cartao.');
      }

      console.log('[mercado-pago-card-payment] cartao processado:', {
        orderId: orderData.orderId,
        mercadoPagoOrderId: providerOrderId,
        paymentId: providerPaymentId,
        status: paymentStatus,
        networkId,
      });

      return {
        provider: this.name,
        paymentMethod: 'card',
        gatewayOrderId: providerOrderId,
        gatewayChargeId: providerPaymentId,
        status: mapMercadoPagoStatus(paymentStatus),
        qrCode: '',
        pixCopyPaste: '',
        paymentReference: providerPaymentId,
        paymentStatusDetail,
        paidAt: paymentStatus === 'approved' ? new Date().toISOString() : undefined,
      };
    } catch (error) {
      const message = extractMercadoPagoError(error, 'Erro ao processar cartao Mercado Pago.');
      console.error('[mercado-pago-card-payment] falha ao processar cartao:', {
        orderId: orderData.orderId,
        message,
      });
      throw new Error(message);
    }
  }

  async getTransactionStatus(paymentId: string): Promise<GatewayStatus> {
    const paymentClient = createPaymentClient();

    try {
      const response = await paymentClient.get({ id: paymentId }) as any;
      const payment = getOrderPayment(response as MercadoPagoOrder);
      const status = String(payment.status || response.status || '');

      return {
        status: mapMercadoPagoStatus(status),
        paidAt: status === 'approved'
          ? payment.date_approved || response.date_approved || new Date().toISOString()
          : undefined,
        failureCode: payment.status_detail || response.status_detail || undefined,
        statusDetail: status || undefined,
      };
    } catch {
      const orderClient = createOrderClient();
      const response = await orderClient.get({ id: paymentId }) as any;
      const payment = getOrderPayment(response as MercadoPagoOrder);
      const status = String(payment.status || response.status || '');

      return {
        status: mapMercadoPagoStatus(status),
        paidAt: status === 'approved'
          ? payment.date_approved || response.date_approved || new Date().toISOString()
          : undefined,
        failureCode: payment.status_detail || response.status_detail || undefined,
        statusDetail: status || undefined,
      };
    }
  }
}
