import { MailtrapTransport } from 'mailtrap';
import nodemailer from 'nodemailer';

import {
  EmailOrderTemplateData,
  EmailTemplateResult,
  orderStatusUpdateCustomerTemplate,
  operationalAdminTemplate,
  passwordResetTemplate,
  paymentConfirmedAdminTemplate,
  paymentConfirmedCustomerTemplate,
  paymentExpiredCustomerTemplate,
  paymentFailedCustomerTemplate,
  pendingOrderAdminTemplate,
  trackingCodeCustomerTemplate,
} from './EmailTemplates';
import { prisma } from '../lib/prisma';
import { brand } from '../lib/brand';

type EmailOrder = {
  id: number;
  total: unknown;
  status?: string | null;
  trackingToken?: string | null;
  trackingCode?: string | null;
  paymentMethod?: string | null;
  orderNotes?: string | null;
  shippingAddress?: unknown;
  melhorEnvioServiceId?: number | null;
  customer?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  items?: Array<{
    quantity: number;
    price: unknown;
    product?: {
      name?: string | null;
    } | null;
  }>;
};

type EmailSendParams = {
  type: string;
  to?: string | null;
  order?: EmailOrder;
  template: EmailTemplateResult;
};

const BRAND_NAME = brand.name;
const DEFAULT_CONTACT_EMAIL = brand.email.contact;

let cachedSettings: Record<string, string | null> | null = null;
let cachedSettingsAt = 0;
const SETTINGS_CACHE_TTL = 60000;

async function loadCachedSettings(): Promise<Record<string, string | null>> {
  const now = Date.now();

  if (cachedSettings && now - cachedSettingsAt < SETTINGS_CACHE_TTL) {
    return cachedSettings;
  }

  try {
    const settings = await prisma.storeSettings.findUnique({ where: { id: 1 } });
    cachedSettings = settings ? (settings as unknown as Record<string, string | null>) : {};
    cachedSettingsAt = now;
  } catch {
    if (!cachedSettings) {
      cachedSettings = {};
      cachedSettingsAt = now;
    }
  }

  return cachedSettings;
}

async function getSetting(key: string, envFallback?: string): Promise<string | undefined> {
  const settings = await loadCachedSettings();
  const value = settings[key];
  if (typeof value === 'string' && value) return value;
  return envFallback || undefined;
}

async function getAdminRecipient(): Promise<string | undefined> {
  return getSetting('adminOrderEmail', process.env.ADMIN_ORDER_EMAIL || process.env.ADMIN_EMAIL);
}

function hasSmtpConfig() {
  return Boolean(process.env.MAIL_HOST && process.env.MAIL_USER && process.env.MAIL_PASS);
}

function getTransporter() {
  // Testes automatizados nao devem disparar e-mails reais. Para testar envio real,
  // defina SEND_EMAILS_IN_TESTS=true explicitamente.
  if (process.env.NODE_ENV === 'test' && process.env.SEND_EMAILS_IN_TESTS !== 'true') {
    return null;
  }

  if (process.env.MAILTRAP_API_TOKEN) {
    return nodemailer.createTransport(
      MailtrapTransport({
        token: process.env.MAILTRAP_API_TOKEN,
      }),
    );
  }

  if (!hasSmtpConfig()) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT || 587),
    secure: process.env.MAIL_SECURE === 'true',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });
}

function formatCurrency(value: unknown) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function maskEmail(email?: string | null) {
  if (!email || !email.includes('@')) {
    return 'sem destinatario';
  }

  const [name, domain] = email.split('@');
  const visible = name.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(2, name.length - visible.length))}@${domain}`;
}

function logEmail(kind: string, order: EmailOrder | undefined, status: string, recipient?: string | null, extra?: string) {
  const orderInfo = order?.id ? ` pedido #${order.id}` : '';
  console.log(
    `[email:${kind}] ${status}${orderInfo} para ${maskEmail(recipient)}${extra ? ` - ${extra}` : ''}`,
  );
}

let urlCacheLoaded = false;

function getStoreBaseUrl() {
  if (!urlCacheLoaded) {
    urlCacheLoaded = true;
    loadCachedSettings().catch(() => {});
  }

  const fromCache = cachedSettings?.storeBaseUrl;
  if (typeof fromCache === 'string' && fromCache) return fromCache.replace(/\/$/, '');

  return String(
    process.env.STORE_BASE_URL || process.env.PUBLIC_STORE_URL || 'http://localhost:5600',
  ).replace(/\/$/, '');
}

function getAdminBaseUrl() {
  const fromCache = cachedSettings?.adminBaseUrl;
  if (typeof fromCache === 'string' && fromCache) return fromCache.replace(/\/$/, '');

  return String(
    process.env.ADMIN_BASE_URL || process.env.PUBLIC_ADMIN_URL || 'http://localhost:5500',
  ).replace(/\/$/, '');
}

function getOrderTrackingUrl(order: EmailOrder) {
  if (!order.trackingToken) {
    return `${getStoreBaseUrl()}/entrar`;
  }

  return `${getStoreBaseUrl()}/acompanhar/${order.trackingToken}`;
}

function getAccountUrl() {
  return `${getStoreBaseUrl()}/minha-conta`;
}

function getAdminOrderUrl(order: EmailOrder) {
  return `${getAdminBaseUrl()}/pedidos/${order.id}`;
}

function buildItemsText(order: EmailOrder) {
  if (!order.items?.length) {
    return 'Consulte os detalhes do pedido no painel.';
  }

  return order.items
    .map(
      (item) =>
        `${item.quantity}x ${item.product?.name || 'Produto'} (${formatCurrency(item.price)} un.)`,
    )
    .join('; ');
}

function normalizeShippingAddress(value: unknown) {
  if (!value || typeof value !== 'object') {
    return { text: null, service: null };
  }

  const address = value as Record<string, any>;
  const parts = [
    address.street,
    address.number,
    address.neighborhood,
    address.city,
    address.state,
    address.zipCode,
  ]
    .filter(Boolean)
    .map(String);
  const shippingOption = address.shippingOption && typeof address.shippingOption === 'object'
    ? (address.shippingOption as Record<string, any>)
    : null;

  return {
    text: parts.length ? parts.join(', ') : null,
    service: shippingOption?.name || shippingOption?.company?.name || null,
  };
}

function getStatusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    PENDING: 'Aguardando pagamento',
    PAID: 'Pagamento confirmado',
    PAID_STOCK_ISSUE: 'Pagamento confirmado, revisao de estoque',
    PREPARING: 'Em separacao',
    PACKED: 'Embalado',
    LABEL_GENERATED: 'Etiqueta gerada',
    POSTED: 'Postado',
    SHIPPED: 'Em transporte',
    DELIVERED: 'Entregue',
    CANCELED: 'Cancelado',
    EXPIRED: 'Pagamento expirado',
    FAILED: 'Pagamento não aprovado',
    REFUNDED: 'Pagamento reembolsado',
  };

  return labels[String(status || '').toUpperCase()] || String(status || 'Atualizado');
}

function getPaymentMethodLabel(method?: string | null) {
  const labels: Record<string, string> = {
    pix: 'Pix',
    card: 'Cartao de credito a vista',
    credit_card: 'Cartao de credito a vista',
    boleto: 'Boleto',
  };

  return labels[String(method || '').toLowerCase()] || method || '-';
}

function friendlyPaymentFailure(reason?: string) {
  const value = String(reason || '').toLowerCase();

  if (value.includes('canceled') || value.includes('cancel')) {
    return 'Pagamento cancelado ou não concluído.';
  }

  if (value.includes('failed') || value.includes('declined')) {
    return 'Pagamento não aprovado pelo processador.';
  }

  return reason || 'Pagamento não aprovado.';
}

function buildOrderTemplateData(order: EmailOrder, extra: Partial<EmailOrderTemplateData> = {}): EmailOrderTemplateData {
  const shipping = normalizeShippingAddress(order.shippingAddress);

  return {
    orderNumber: `#${order.id}`,
    customerName: order.customer?.name,
    customerEmail: order.customer?.email,
    customerPhone: order.customer?.phone,
    total: formatCurrency(order.total),
    statusLabel: getStatusLabel(order.status),
    paymentMethodLabel: getPaymentMethodLabel(order.paymentMethod),
    trackingCode: order.trackingCode,
    trackingUrl: getOrderTrackingUrl(order),
    adminUrl: getAdminOrderUrl(order),
    itemsText: buildItemsText(order),
    shippingAddressText: shipping.text || undefined,
    shippingService: shipping.service || (order.melhorEnvioServiceId ? `Servico ${order.melhorEnvioServiceId}` : undefined),
    orderNotes: order.orderNotes,
    ...extra,
  };
}

export class EmailService {
  private async sendEmail({ type, to, order, template }: EmailSendParams) {
    try {
      const transporter = getTransporter();

      if (!transporter || !to) {
        logEmail(type, order, transporter ? 'sem-destinatario' : 'logged-only', to, template.subject);
        return;
      }

      const mailFrom = await getSetting('mailFrom', process.env.MAIL_FROM || DEFAULT_CONTACT_EMAIL);
      const mailFromName = await getSetting('mailFromName', process.env.MAIL_FROM_NAME || BRAND_NAME);

      const result = await transporter.sendMail({
        from: {
          address: mailFrom || DEFAULT_CONTACT_EMAIL,
          name: mailFromName || BRAND_NAME,
        },
        to,
        subject: template.subject,
        text: template.text,
        html: template.html,
      });

      logEmail(type, order, 'sent', to, String((result as any)?.messageId || '').slice(0, 80));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'erro desconhecido';
      logEmail(type, order, 'failed', to, message.slice(0, 160));
    }
  }

  async sendOrderConfirmation(order: EmailOrder) {
    await this.sendPaymentConfirmedToCustomer(order);
  }

  async sendPaymentConfirmedToCustomer(order: EmailOrder) {
    const recipient = order.customer?.email;
    await this.sendEmail({
      type: 'payment-confirmed-customer',
      to: recipient,
      order,
      template: paymentConfirmedCustomerTemplate(buildOrderTemplateData(order)),
    });
  }

  async sendPaymentConfirmedToAdmin(order: EmailOrder) {
    const recipient = await getAdminRecipient();
    await this.sendEmail({
      type: 'payment-confirmed-admin',
      to: recipient,
      order,
      template: paymentConfirmedAdminTemplate(buildOrderTemplateData(order)),
    });
  }

  async sendPaymentFailed(order: EmailOrder, reason?: string) {
    await this.sendPaymentFailedToCustomer(order, reason);
  }

  async sendPaymentFailedToCustomer(order: EmailOrder, reason?: string) {
    const recipient = order.customer?.email;
    await this.sendEmail({
      type: 'payment-failed-customer',
      to: recipient,
      order,
      template: paymentFailedCustomerTemplate(
        buildOrderTemplateData(order, {
          reason: friendlyPaymentFailure(reason),
          trackingUrl: getOrderTrackingUrl(order),
        }),
      ),
    });
  }

  async sendNewOrderNotification(order: EmailOrder) {
    if (process.env.SEND_ADMIN_PENDING_ORDER_EMAIL === 'false') {
      logEmail('admin-pending-order', order, 'skipped', process.env.ADMIN_ORDER_EMAIL || process.env.ADMIN_EMAIL);
      return;
    }

    const recipient = await getAdminRecipient();
    await this.sendEmail({
      type: 'admin-pending-order',
      to: recipient,
      order,
      template: pendingOrderAdminTemplate(buildOrderTemplateData(order)),
    });
  }

  async sendOrderStatusUpdate(order: EmailOrder) {
    const recipient = order.customer?.email;
    await this.sendEmail({
      type: 'order-status-update-customer',
      to: recipient,
      order,
      template: orderStatusUpdateCustomerTemplate(buildOrderTemplateData(order)),
    });
  }

  async sendTrackingCodeToCustomer(order: EmailOrder) {
    if (!order.trackingCode) {
      logEmail('tracking-code-customer', order, 'skipped', order.customer?.email, 'sem codigo de rastreio');
      return;
    }

    const recipient = order.customer?.email;
    await this.sendEmail({
      type: 'tracking-code-customer',
      to: recipient,
      order,
      template: trackingCodeCustomerTemplate(buildOrderTemplateData(order)),
    });
  }

  async sendPaymentExpired(order: EmailOrder) {
    const recipient = order.customer?.email;
    await this.sendEmail({
      type: 'payment-expired-customer',
      to: recipient,
      order,
      template: paymentExpiredCustomerTemplate(
        buildOrderTemplateData(order, {
          trackingUrl: getAccountUrl(),
          statusLabel: 'Pagamento expirado',
        }),
      ),
    });
  }

  async sendPasswordReset(to: string, resetUrl: string) {
    await this.sendEmail({
      type: 'password-reset',
      to,
      template: passwordResetTemplate(resetUrl),
    });
  }

  async sendOperationalAdminNotification(params: {
    type: string;
    subject: string;
    intro: string;
    rows?: Array<{ label: string; value?: string | null }>;
  }) {
    const recipient = await getAdminRecipient();

    await this.sendEmail({
      type: params.type,
      to: recipient,
      template: operationalAdminTemplate({
        title: params.subject,
        intro: params.intro,
        rows: params.rows,
        button: { label: 'Abrir painel admin', url: getAdminBaseUrl() },
      }),
    });
  }
}
