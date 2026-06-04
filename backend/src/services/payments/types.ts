export type PaymentMethod = 'pix' | 'card';

export type PaymentCustomer = {
  name: string;
  email: string;
  cpf?: string | null;
  phone?: string | null;
};

export type PaymentItem = {
  productId: number;
  quantity: number;
  price: number;
  name: string;
};

export type CreateTransactionInput = {
  orderId: number;
  total: number;
  paymentMethod: PaymentMethod;
  cardToken?: string;
  cardNetworkId?: string;
  items: PaymentItem[];
  customer: PaymentCustomer;
};

export type PaymentTransaction = {
  provider: string;
  paymentMethod: PaymentMethod;
  gatewayOrderId: string;
  gatewayChargeId: string;
  status: string;
  qrCode: string;
  qrCodeBase64?: string | null;
  pixCopyPaste: string;
  ticketUrl?: string | null;
  paymentReference?: string | null;
  paymentStatusDetail?: string | null;
  clientSecret?: string | null;
  expiresAt?: string;
  paidAt?: string;
};

export type GatewayStatus = {
  status: string;
  paidAt?: string;
  failureCode?: string;
  statusDetail?: string;
  clientSecret?: string | null;
  expiresAt?: string;
};

export type StripeWebhookEvent = {
  type: string;
  data: {
    object: {
      id?: string;
      status?: string;
      client_reference_id?: string;
      payment_intent?: string;
      payment_status?: string;
      metadata?: Record<string, string | undefined>;
    };
  };
};

export interface PaymentProvider {
  name: string;
  supportedMethods: PaymentMethod[];
  createTransaction(orderData: CreateTransactionInput): Promise<PaymentTransaction>;
  getTransactionStatus?(chargeId: string): Promise<GatewayStatus>;
}
