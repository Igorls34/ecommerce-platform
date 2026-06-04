import { LocalPixPaymentProvider } from './providers/LocalPixPaymentProvider';
import { MercadoPagoCardPaymentProvider } from './providers/MercadoPagoCardPaymentProvider';
import { MercadoPagoPixPaymentProvider } from './providers/MercadoPagoPixPaymentProvider';
import { StripeCardPaymentProvider } from './providers/StripeCardPaymentProvider';
import { PaymentMethod, PaymentProvider } from './types';

function normalizeProviderName(value: string | undefined | null) {
  return String(value || '').trim().toLowerCase();
}

let dbSettingsCache: Record<string, string | null> | null = null;
let dbSettingsCacheAt = 0;

async function getDbSetting(key: string): Promise<string | undefined> {
  const now = Date.now();

  if (!dbSettingsCache || now - dbSettingsCacheAt > 60000) {
    try {
      const { prisma } = await import('../../lib/prisma');
      const row = await prisma.storeSettings.findUnique({ where: { id: 1 } });
      dbSettingsCache = row ? (row as unknown as Record<string, string | null>) : {};
      dbSettingsCacheAt = now;
    } catch {
      if (!dbSettingsCache) {
        dbSettingsCache = {};
        dbSettingsCacheAt = now;
      }
    }
  }

  const value = dbSettingsCache[key];
  return typeof value === 'string' && value ? value : undefined;
}

export class PaymentProviderRegistry {
  private providers: PaymentProvider[];

  readonly stripe: StripeCardPaymentProvider;
  readonly mercadoPago: MercadoPagoPixPaymentProvider;
  readonly mercadoPagoCard: MercadoPagoCardPaymentProvider;

  constructor() {
    this.stripe = new StripeCardPaymentProvider();
    this.mercadoPago = new MercadoPagoPixPaymentProvider();
    this.mercadoPagoCard = new MercadoPagoCardPaymentProvider();
    this.providers = [
      new LocalPixPaymentProvider(),
      this.mercadoPago,
      this.mercadoPagoCard,
      this.stripe,
    ];
  }

  async getProviderForMethod(paymentMethod: PaymentMethod) {
    const providerName = await this.getConfiguredProviderName(paymentMethod);
    const provider = this.providers.find(
      (candidate) =>
        candidate.name === providerName && candidate.supportedMethods.includes(paymentMethod),
    );

    if (!provider) {
      throw new Error(
        `Provedor de pagamento "${providerName}" não suporta ${paymentMethod}. Verifique PAYMENT_${paymentMethod.toUpperCase()}_PROVIDER.`,
      );
    }

    return provider;
  }

  getProviderByGatewayChargeId(chargeId: string) {
    if (chargeId.startsWith('local-')) {
      return this.providers.find((provider) => provider.name === 'local') || null;
    }

    if (chargeId.startsWith('pi_')) {
      return this.stripe;
    }

    if (/^\d+$/.test(chargeId)) {
      return this.mercadoPago;
    }

    return null;
  }

  private async getConfiguredProviderName(paymentMethod: PaymentMethod) {
    if (paymentMethod === 'pix') {
      const fromDb = await getDbSetting('pixProvider');
      if (fromDb) return normalizeProviderName(fromDb) || 'local';
      return normalizeProviderName(process.env.PAYMENT_PIX_PROVIDER || process.env.PAYMENT_PROVIDER) || 'local';
    }

    const fromDb = await getDbSetting('cardProvider');
    if (fromDb) return normalizeProviderName(fromDb) || 'stripe';
    return normalizeProviderName(process.env.PAYMENT_CARD_PROVIDER) || 'stripe';
  }
}
