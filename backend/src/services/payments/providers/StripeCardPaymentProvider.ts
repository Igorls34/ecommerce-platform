import Stripe from 'stripe';

import {
  CreateTransactionInput,
  GatewayStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentTransaction,
  StripeWebhookEvent,
} from '../types';
import { brand } from '../../../lib/brand';

type StripeErrorLike = {
  message?: string;
};

function toCents(value: number) {
  return Math.round(Number(value || 0) * 100);
}

function mapStripeStatus(status: string) {
  if (status === 'succeeded') {
    return 'paid';
  }

  if (['canceled', 'requires_payment_method'].includes(status)) {
    return 'failed';
  }

  return 'pending';
}

function getStripeErrorMessage(error: unknown) {
  return error && typeof error === 'object' && 'message' in error
    ? String((error as StripeErrorLike).message || '')
    : '';
}

export function createStripePaymentError(error: unknown, paymentMethod: 'pix' | 'card' = 'card') {
  const message = getStripeErrorMessage(error);

  return new Error(
    message ||
      `Não foi possível gerar o pagamento ${paymentMethod === 'card' ? 'com cartao' : 'PIX'} na Stripe.`,
  );
}

export class StripeCardPaymentProvider implements PaymentProvider {
  name = 'stripe';
  supportedMethods: PaymentMethod[] = ['card'];

  private stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';

  hasCredentials() {
    return Boolean(this.stripeSecretKey && !this.stripeSecretKey.includes('xxxxx'));
  }

  getClient() {
    if (!this.hasCredentials()) {
      return null;
    }

    return new Stripe(this.stripeSecretKey);
  }

  async createTransaction(orderData: CreateTransactionInput): Promise<PaymentTransaction> {
    if (orderData.paymentMethod !== 'card') {
      throw new Error('Provedor Stripe configurado neste sistema suporta apenas cartão.');
    }

    const stripe = this.getClient();

    if (!stripe) {
      throw new Error('Pagamento com cartão exige STRIPE_SECRET_KEY configurada.');
    }

    try {
      // Cartao deve ser coletado com Stripe Elements no frontend. O backend cria
      // apenas o PaymentIntent e retorna clientSecret; numero/CVV nunca passam por aqui.
      const paymentIntent = await stripe.paymentIntents.create({
        amount: toCents(orderData.total),
        currency: 'brl',
        payment_method_types: ['card'],
        receipt_email: orderData.customer.email,
        metadata: {
          order_id: String(orderData.orderId),
          orderId: String(orderData.orderId),
        },
        description: `${brand.payment.descriptionPrefix} ${brand.name} #${orderData.orderId}`,
      });

      return {
        provider: this.name,
        paymentMethod: 'card',
        gatewayOrderId: paymentIntent.id,
        gatewayChargeId:
          typeof paymentIntent.latest_charge === 'string'
            ? paymentIntent.latest_charge
            : paymentIntent.id,
        status: mapStripeStatus(paymentIntent.status),
        qrCode: '',
        pixCopyPaste: '',
        paymentReference: paymentIntent.id,
        paymentStatusDetail: paymentIntent.status,
        clientSecret: paymentIntent.client_secret,
        paidAt: paymentIntent.status === 'succeeded' ? new Date().toISOString() : undefined,
      };
    } catch (error) {
      console.error('[stripe-payment] falha ao criar cartao:', createStripePaymentError(error).message);
      throw createStripePaymentError(error);
    }
  }

  constructWebhookEvent(
    rawBody: Buffer,
    signature: string | string[] | undefined,
  ): StripeWebhookEvent {
    if (process.env.NODE_ENV === 'test') {
      return JSON.parse(rawBody.toString('utf8')) as StripeWebhookEvent;
    }

    const stripe = this.getClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

    if (!stripe || !webhookSecret) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Stripe webhook secret não configurado.');
      }

      console.warn(
        '[stripe-webhook] STRIPE_WEBHOOK_SECRET ausente; aceitando payload sem verificação (apenas non-production).',
      );
      return JSON.parse(rawBody.toString('utf8')) as StripeWebhookEvent;
    }

    const normalizedSignature = Array.isArray(signature) ? signature[0] : signature;

    if (!normalizedSignature) {
      throw new Error('Assinatura Stripe ausente.');
    }

    return stripe.webhooks.constructEvent(
      rawBody,
      normalizedSignature,
      webhookSecret,
    ) as StripeWebhookEvent;
  }

  async getTransactionStatus(chargeId: string): Promise<GatewayStatus> {
    const stripe = this.getClient();

    if (!stripe) {
      throw new Error('Stripe não configurado.');
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(chargeId);

    return {
      status: mapStripeStatus(paymentIntent.status),
      paidAt: paymentIntent.status === 'succeeded' ? new Date().toISOString() : undefined,
      failureCode: paymentIntent.last_payment_error?.code || undefined,
      statusDetail: paymentIntent.status,
      clientSecret: paymentIntent.client_secret || undefined,
    };
  }
}
