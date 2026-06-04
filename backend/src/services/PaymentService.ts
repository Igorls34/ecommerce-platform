import { PaymentProviderRegistry } from './payments/PaymentProviderRegistry';
import {
  CreateTransactionInput,
  GatewayStatus,
  PaymentMethod,
  PaymentTransaction,
  StripeWebhookEvent,
} from './payments/types';

export {
  CreateTransactionInput,
  GatewayStatus,
  PaymentMethod,
  PaymentTransaction,
  StripeWebhookEvent,
};

function normalizePaymentMethod(value: string): PaymentMethod | null {
  const method = String(value || '').trim().toLowerCase();

  if (method === 'pix' || method === 'card') {
    return method;
  }

  return null;
}

export class PaymentService {
  private registry = new PaymentProviderRegistry();

  async createTransaction(
    orderData: Omit<CreateTransactionInput, 'paymentMethod'> & { paymentMethod: string },
  ): Promise<PaymentTransaction> {
    const paymentMethod = normalizePaymentMethod(orderData.paymentMethod);

    if (!paymentMethod) {
      throw new Error('Método de pagamento não integrado ao gateway neste momento.');
    }

    const provider = await this.registry.getProviderForMethod(paymentMethod);

    return provider.createTransaction({
      ...orderData,
      paymentMethod,
    });
  }

  constructStripeWebhookEvent(
    rawBody: Buffer,
    signature: string | string[] | undefined,
  ): StripeWebhookEvent {
    return this.registry.stripe.constructWebhookEvent(rawBody, signature);
  }

  async getTransactionStatus(chargeId: string): Promise<GatewayStatus> {
    const provider = this.registry.getProviderByGatewayChargeId(chargeId);

    if (!provider?.getTransactionStatus) {
      throw new Error('Não foi possível consultar o status no provedor de pagamento.');
    }

    return provider.getTransactionStatus(chargeId);
  }

  verifyMercadoPagoWebhookSignature({
    signatureHeader,
    requestId,
    dataId,
  }: {
    signatureHeader: string | string[] | undefined;
    requestId: string | string[] | undefined;
    dataId: string | string[] | undefined;
  }) {
    return this.registry.mercadoPago.verifyWebhookSignature({
      signatureHeader,
      requestId,
      dataId,
    });
  }

  async getMercadoPagoPayment(paymentId: string) {
    return this.registry.mercadoPago.getPayment(paymentId);
  }
}
