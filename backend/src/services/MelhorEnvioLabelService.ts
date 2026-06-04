import { Prisma } from '@prisma/client';

import { melhorEnvioAuthService } from './MelhorEnvioAuthService';
import { decryptCpf } from './SensitiveDataService';

type ShipmentAddress = {
  name?: string;
  phone?: string | null;
  email?: string;
  document?: string;
  company_document?: string;
  state_register?: string;
  address: string;
  complement?: string;
  number: string;
  district: string;
  city: string;
  state_abbr: string;
  country_id?: string;
  postal_code: string;
};

type NormalizedShippingAddress = {
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  recipientDocument: string;
};

type CreateShipmentParams = {
  serviceId: number;
  agency?: number;
  order: {
    id: number;
    total: Prisma.Decimal | number | string;
    customer: {
      name: string;
      email: string;
      cpf?: string | null;
      phone?: string | null;
    };
    items: Array<{
      quantity: number;
      price: Prisma.Decimal | number | string;
      product: {
        id: number;
        name: string;
      };
      variant?: {
        name: string;
      } | null;
    }>;
    shippingAddress?: unknown;
  };
};

type MelhorEnvioCreatedShipment = {
  id?: string;
  protocol?: string;
  status?: string;
};

type MelhorEnvioPrintResponse = {
  url?: string;
  print?: string;
};

type MelhorEnvioPreviewResponse = unknown;
type MelhorEnvioAccountResponse = unknown;
type MelhorEnvioTrackingResponse = unknown;

type MelhorEnvioBalanceResponse = unknown;

type WaitForPrintableLabelOptions = {
  attempts?: number;
  intervalMs?: number;
};

type PrintableLabelResult = {
  printData: MelhorEnvioPrintResponse;
  trackingData: MelhorEnvioTrackingResponse | null;
  searchData: MelhorEnvioTrackingResponse | null;
  labelUrl: string;
  trackingCode: string;
  attempts: number;
};

export type MelhorEnvioErrorCode =
  | 'MELHOR_ENVIO_TOKEN'
  | 'MELHOR_ENVIO_ENVIRONMENT'
  | 'MELHOR_ENVIO_BALANCE'
  | 'MELHOR_ENVIO_VALIDATION'
  | 'MELHOR_ENVIO_API';

export class MelhorEnvioApiError extends Error {
  constructor(
    message: string,
    public readonly code: MelhorEnvioErrorCode,
    public readonly details: string[] = [],
  ) {
    super(message);
  }
}

export class MelhorEnvioLabelService {
  private readonly apiUrl =
    process.env.MELHOR_ENVIO_API_URL || 'https://sandbox.melhorenvio.com.br/api/v2/me';
  private readonly userAgent =
    process.env.MELHOR_ENVIO_USER_AGENT || 'Thessara-Store/1.0 (thessarasemijoias@gmail.com)';
  private readonly fromAddress = this.buildFromAddress();
  private readonly defaultWeight = Number(process.env.STORE_WEIGHT) || 0.5;
  private readonly defaultLength = Number(process.env.STORE_LENGTH) || 20;
  private readonly defaultWidth = Number(process.env.STORE_WIDTH) || 15;
  private readonly defaultHeight = Number(process.env.STORE_HEIGHT) || 10;
  private readonly labelReadyAttempts = Math.max(
    1,
    Number(process.env.MELHOR_ENVIO_LABEL_READY_ATTEMPTS || 8),
  );
  private readonly labelReadyIntervalMs = Math.max(
    0,
    Number(
      process.env.MELHOR_ENVIO_LABEL_READY_INTERVAL_MS ||
        process.env.MELHOR_ENVIO_LABEL_PRINT_DELAY_MS ||
        3000,
    ),
  );

  async addShipmentToCart(params: CreateShipmentParams): Promise<MelhorEnvioCreatedShipment> {
    this.validateShipmentParams(params);
    const productsInsuranceValue = this.calculateProductsInsuranceValue(params.order);

    const body = {
      service: params.serviceId,
      ...(params.agency ? { agency: params.agency } : {}),
      from: this.fromAddress,
      to: this.buildRecipientAddress(params.order),
      products: params.order.items.map((item) => ({
        id: String(item.product.id),
        name: item.variant?.name ? `${item.product.name} - ${item.variant.name}` : item.product.name,
        quantity: item.quantity,
        unitary_value: Number(item.price),
      })),
      volumes: [
        {
          format: 'box',
          height: this.defaultHeight,
          width: this.defaultWidth,
          length: this.defaultLength,
          weight: this.defaultWeight.toFixed(2),
          insurance_value: productsInsuranceValue.toFixed(2),
          products: params.order.items.map((item) => ({
            id: String(item.product.id),
            quantity: item.quantity,
          })),
        },
      ],
      options: {
        insurance_value: productsInsuranceValue,
        receipt: false,
        own_hand: false,
        collect: false,
      },
    };

    return this.request('/cart', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async checkoutShipment(melhorEnvioOrderId: string) {
    return this.request('/shipment/checkout', {
      method: 'POST',
      body: JSON.stringify({ orders: [melhorEnvioOrderId] }),
    });
  }

  async generateShipment(melhorEnvioOrderId: string) {
    return this.request('/shipment/generate', {
      method: 'POST',
      body: JSON.stringify({ orders: [melhorEnvioOrderId] }),
    });
  }

  async printShipment(melhorEnvioOrderId: string): Promise<MelhorEnvioPrintResponse> {
    return this.request('/shipment/print', {
      method: 'POST',
      body: JSON.stringify({ mode: 'public', orders: [melhorEnvioOrderId] }),
    });
  }

  async previewShipment(melhorEnvioOrderId: string): Promise<MelhorEnvioPreviewResponse> {
    return this.request('/shipment/preview', {
      method: 'POST',
      body: JSON.stringify({ orders: [melhorEnvioOrderId] }),
    });
  }

  async waitForPrintableLabel(
    melhorEnvioOrderId: string,
    options: WaitForPrintableLabelOptions = {},
  ): Promise<PrintableLabelResult> {
    const attempts = Math.max(1, Number(options.attempts || this.labelReadyAttempts));
    const intervalMs = Math.max(0, Number(options.intervalMs ?? this.labelReadyIntervalMs));
    let lastError: unknown = null;
    let lastPrintData: MelhorEnvioPrintResponse | null = null;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const printData = await this.printShipment(melhorEnvioOrderId);
        const labelUrl = this.extractUrl(printData);
        lastPrintData = printData;

        if (labelUrl) {
          const [trackingData, searchData] = await Promise.all([
            this.trackShipment(melhorEnvioOrderId).catch(() => null),
            this.searchShipment(melhorEnvioOrderId).catch(() => null),
          ]);
          const trackingCode = this.extractTrackingCode(printData, trackingData, searchData);

          return {
            printData,
            trackingData,
            searchData,
            labelUrl,
            trackingCode,
            attempts: attempt,
          };
        }
      } catch (error) {
        lastError = error;
      }

      if (attempt < attempts && intervalMs > 0) {
        await this.wait(intervalMs);
      }
    }

    const details =
      lastError instanceof MelhorEnvioApiError
        ? lastError.details
        : lastPrintData
          ? ['O Melhor Envio respondeu sem URL de impressao.']
          : [];

    throw new MelhorEnvioApiError(
      'A etiqueta foi solicitada, mas o Melhor Envio ainda não liberou o PDF para impressão. Tente liberar a impressao novamente em alguns instantes.',
      'MELHOR_ENVIO_API',
      details,
    );
  }

  async trackShipment(melhorEnvioOrderId: string): Promise<MelhorEnvioTrackingResponse> {
    return this.request('/shipment/tracking', {
      method: 'POST',
      body: JSON.stringify({ orders: [melhorEnvioOrderId] }),
    });
  }

  async searchShipment(melhorEnvioOrderId: string): Promise<MelhorEnvioTrackingResponse> {
    return this.request(`/orders/search?q=${encodeURIComponent(melhorEnvioOrderId)}`, {
      method: 'GET',
    });
  }

  async getBalance(): Promise<MelhorEnvioBalanceResponse> {
    return this.request('/balance', {
      method: 'GET',
    });
  }

  async getAccount(): Promise<MelhorEnvioAccountResponse> {
    return this.request('', {
      method: 'GET',
    });
  }

  extractTrackingCode(...payloads: unknown[]) {
    for (const payload of payloads) {
      const trackingCode = this.findTrackingCode(payload);

      if (trackingCode) {
        return trackingCode;
      }
    }

    return '';
  }

  extractUrl(...payloads: unknown[]) {
    for (const payload of payloads) {
      const url = this.findUrl(payload);

      if (url) {
        return url;
      }
    }

    return '';
  }

  private async request(
    pathname: string,
    init: RequestInit,
    retryAfterRefresh = true,
  ): Promise<any> {
    const token = await melhorEnvioAuthService.getAccessToken().catch((error) => {
      const message = error instanceof Error ? error.message : '';
      throw new MelhorEnvioApiError(
        message || 'Erro de autenticação no Melhor Envio. Verifique o token.',
        'MELHOR_ENVIO_TOKEN',
      );
    });

    const response = await fetch(`${this.apiUrl.replace(/\/$/, '')}${pathname}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': this.userAgent,
        ...(init.headers || {}),
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.error('Erro na API Melhor Envio:', {
        path: pathname,
        status: response.status,
        statusText: response.statusText,
        message: this.extractErrorMessage(data),
      });

      if (response.status === 401) {
        if (retryAfterRefresh) {
          await melhorEnvioAuthService.refreshAfterUnauthorized().catch((error) => {
            const message = error instanceof Error ? error.message : '';
            throw new MelhorEnvioApiError(
              message || 'Erro de autenticação no Melhor Envio. Verifique o token.',
              'MELHOR_ENVIO_TOKEN',
            );
          });
          return this.request(pathname, init, false);
        }

        throw new MelhorEnvioApiError(
          'Erro de autenticação no Melhor Envio. Verifique o token.',
          'MELHOR_ENVIO_TOKEN',
        );
      }

      if (response.status === 403) {
        throw new MelhorEnvioApiError(
          'Erro de ambiente. Confira se token e API_URL são ambos sandbox ou ambos produção.',
          'MELHOR_ENVIO_ENVIRONMENT',
        );
      }

      if (response.status === 402) {
        throw new MelhorEnvioApiError(
          'Não foi possível comprar a etiqueta. Verifique saldo ou forma de pagamento no Melhor Envio.',
          'MELHOR_ENVIO_BALANCE',
        );
      }

      const details = this.extractValidationMessages(data);
      if (response.status === 422 || response.status === 400) {
        const message = this.extractErrorMessage(data);
        throw new MelhorEnvioApiError(
          details.length
            ? `Revise os dados obrigatorios antes de gerar a etiqueta: ${details.join(' | ')}`
            : message ||
                'Não foi possível gerar etiqueta. Verifique saldo, dados do remetente, destinatario e servico escolhido.',
          'MELHOR_ENVIO_VALIDATION',
          details,
        );
      }

      throw new MelhorEnvioApiError(
        this.extractErrorMessage(data) ||
          'Não foi possível gerar etiqueta. Verifique saldo, dados do remetente, destinatario e servico escolhido.',
        'MELHOR_ENVIO_API',
      );
    }

    return data;
  }

  private wait(milliseconds: number) {
    if (milliseconds <= 0) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  }

  private buildFromAddress(): ShipmentAddress {
    return this.cleanAddress({
      name: process.env.STORE_SENDER_NAME || 'Thessara',
      phone: process.env.STORE_SENDER_PHONE || '',
      email: process.env.STORE_SENDER_EMAIL || 'thessarasemijoias@gmail.com',
      document: this.onlyDigits(process.env.STORE_SENDER_DOCUMENT || ''),
      company_document: this.onlyDigits(process.env.STORE_SENDER_COMPANY_DOCUMENT || ''),
      state_register: process.env.STORE_SENDER_STATE_REGISTER || '',
      address: process.env.STORE_SENDER_ADDRESS || '',
      complement: process.env.STORE_SENDER_COMPLEMENT || '',
      number: process.env.STORE_SENDER_NUMBER || '',
      district: process.env.STORE_SENDER_DISTRICT || '',
      city: process.env.STORE_SENDER_CITY || '',
      state_abbr: process.env.STORE_SENDER_STATE || process.env.STORE_STATE || '',
      country_id: 'BR',
      postal_code: this.onlyDigits(process.env.STORE_ZIP_CODE || ''),
    });
  }

  private buildRecipientAddress(order: CreateShipmentParams['order']): ShipmentAddress {
    const address = this.normalizeShippingAddress(order.shippingAddress);

    if (!address) {
      throw new MelhorEnvioApiError(
        'Pedido sem endereço de entrega salvo. Não é possível gerar etiqueta.',
        'MELHOR_ENVIO_VALIDATION',
        ['endereco de entrega'],
      );
    }

    const recipientDocument = this.onlyDigits(
      decryptCpf(order.customer.cpf) || address.recipientDocument,
    );

    if (
      !recipientDocument ||
      (!this.isValidCpf(recipientDocument) && !this.isValidCnpj(recipientDocument))
    ) {
      throw new MelhorEnvioApiError(
        'Informe um CPF ou CNPJ válido do destinatário antes de criar a etiqueta.',
        'MELHOR_ENVIO_VALIDATION',
        ['documento do destinatario'],
      );
    }

    return this.cleanAddress({
      name: order.customer.name,
      phone: order.customer.phone || '',
      email: order.customer.email,
      document: recipientDocument,
      address: address.street,
      complement: address.complement,
      number: address.number,
      district: address.neighborhood,
      city: address.city,
      state_abbr: address.state,
      country_id: 'BR',
      postal_code: this.onlyDigits(address.zipCode),
    });
  }

  private normalizeShippingAddress(value: unknown): NormalizedShippingAddress | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const address = value as Record<string, unknown>;

    return {
      zipCode: String(address.zipCode || ''),
      street: String(address.street || ''),
      number: String(address.number || ''),
      complement: String(address.complement || ''),
      neighborhood: String(address.neighborhood || ''),
      city: String(address.city || ''),
      state: String(address.state || '').toUpperCase(),
      recipientDocument: this.onlyDigits(String(address.recipientDocument || '')),
    };
  }

  private calculateProductsInsuranceValue(order: CreateShipmentParams['order']) {
    const productsValue = order.items.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
      0,
    );

    return productsValue > 0 ? productsValue : Number(order.total || 0);
  }

  private cleanAddress(address: ShipmentAddress): ShipmentAddress {
    const cleaned = { ...address };

    for (const key of Object.keys(cleaned) as Array<keyof ShipmentAddress>) {
      const value = cleaned[key];
      if (typeof value === 'string' && !value.trim()) {
        delete cleaned[key];
      }
    }

    if (cleaned.company_document && !this.isValidCnpj(cleaned.company_document)) {
      delete cleaned.company_document;
      delete cleaned.state_register;
    }

    if (
      cleaned.state_register &&
      !/^\d+$/.test(cleaned.state_register) &&
      cleaned.state_register.toUpperCase() !== 'ISENTO'
    ) {
      delete cleaned.state_register;
    }

    return cleaned;
  }

  private onlyDigits(value: string) {
    return String(value || '').replace(/[^\d]/g, '');
  }

  private isValidCnpj(value: string) {
    const cnpj = this.onlyDigits(value);

    if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) {
      return false;
    }

    const calculateDigit = (length: number) => {
      const weights =
        length === 12
          ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
          : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      const sum = weights.reduce((total, weight, index) => total + Number(cnpj[index]) * weight, 0);
      const remainder = sum % 11;
      return remainder < 2 ? 0 : 11 - remainder;
    };

    return calculateDigit(12) === Number(cnpj[12]) && calculateDigit(13) === Number(cnpj[13]);
  }

  private isValidCpf(value: string) {
    const cpf = this.onlyDigits(value);

    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
      return false;
    }

    const calculateDigit = (length: number) => {
      let sum = 0;

      for (let index = 0; index < length; index += 1) {
        sum += Number(cpf[index]) * (length + 1 - index);
      }

      const digit = (sum * 10) % 11;
      return digit === 10 ? 0 : digit;
    };

    return calculateDigit(9) === Number(cpf[9]) && calculateDigit(10) === Number(cpf[10]);
  }

  private validateShipmentParams(params: CreateShipmentParams) {
    const missing: string[] = [];
    const from = this.fromAddress;
    const address = this.normalizeShippingAddress(params.order.shippingAddress);

    if (!params.serviceId || Number.isNaN(params.serviceId)) {
      missing.push('servico de frete');
    }

    if (
      !this.onlyDigits(from.postal_code || '') ||
      this.onlyDigits(from.postal_code || '').length !== 8
    ) {
      missing.push('CEP de origem');
    }

    for (const [field, label] of [
      [from.name, 'nome do remetente'],
      [from.email, 'e-mail do remetente'],
      [from.phone, 'telefone do remetente'],
      [from.address, 'endereço do remetente'],
      [from.number, 'número do remetente'],
      [from.district, 'bairro do remetente'],
      [from.city, 'cidade do remetente'],
      [from.state_abbr, 'UF do remetente'],
    ] as Array<[string | undefined | null, string]>) {
      if (!String(field || '').trim()) {
        missing.push(label);
      }
    }

    if (!from.document && !from.company_document) {
      missing.push('CPF ou CNPJ do remetente');
    }

    if (!address) {
      missing.push('endereco de entrega');
    } else {
      for (const [field, label] of [
        [address.zipCode, 'CEP do destinatario'],
        [address.street, 'logradouro do destinatario'],
        [address.number, 'número do destinatário'],
        [address.neighborhood, 'bairro do destinatario'],
        [address.city, 'cidade do destinatario'],
        [address.state, 'UF do destinatario'],
      ] as Array<[string | undefined | null, string]>) {
        if (!String(field || '').trim()) {
          missing.push(label);
        }
      }
    }

    if (
      this.defaultWeight <= 0 ||
      this.defaultLength <= 0 ||
      this.defaultWidth <= 0 ||
      this.defaultHeight <= 0
    ) {
      missing.push('peso e dimensoes do pacote');
    }

    if (missing.length) {
      throw new MelhorEnvioApiError(
        `Complete os dados antes de gerar a etiqueta: ${missing.join(', ')}.`,
        'MELHOR_ENVIO_VALIDATION',
        missing,
      );
    }
  }

  private extractErrorMessage(data: unknown) {
    const validationMessages = this.extractValidationMessages(data);

    if (validationMessages.length) {
      return validationMessages.join(' | ');
    }

    if (!data || typeof data !== 'object') {
      return '';
    }

    const payload = data as Record<string, unknown>;

    if (typeof payload.message === 'string') {
      return payload.message;
    }

    if (typeof payload.error === 'string') {
      return payload.error;
    }

    return '';
  }

  private extractValidationMessages(data: unknown): string[] {
    if (!data || typeof data !== 'object') {
      return [];
    }

    const payload = data as Record<string, unknown>;

    if (!payload.errors || typeof payload.errors !== 'object') {
      return [];
    }

    const errors = payload.errors as Record<string, unknown>;

    return Object.entries(errors)
      .flatMap(([field, value]) => {
        if (Array.isArray(value)) {
          return value.map((message) => `${field}: ${String(message)}`);
        }

        if (typeof value === 'string') {
          return `${field}: ${value}`;
        }

        return [];
      })
      .filter(Boolean);
  }

  private findTrackingCode(value: unknown): string {
    if (!value || typeof value !== 'object') {
      return '';
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const result = this.findTrackingCode(item);

        if (result) {
          return result;
        }
      }

      return '';
    }

    const payload = value as Record<string, unknown>;
    const trackingKeys = [
      'tracking',
      'tracking_code',
      'trackingCode',
      'codigo_rastreio',
      'codigoRastreio',
    ];

    for (const key of trackingKeys) {
      const candidate = payload[key];

      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    }

    for (const nested of Object.values(payload)) {
      const result = this.findTrackingCode(nested);

      if (result) {
        return result;
      }
    }

    return '';
  }

  private findUrl(value: unknown): string {
    if (!value || typeof value !== 'object') {
      return typeof value === 'string' && /^https?:\/\//i.test(value.trim()) ? value.trim() : '';
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const result = this.findUrl(item);

        if (result) {
          return result;
        }
      }

      return '';
    }

    const payload = value as Record<string, unknown>;
    const urlKeys = ['url', 'print', 'preview', 'link', 'href', 'pdf', 'file'];

    for (const key of urlKeys) {
      const candidate = payload[key];

      if (typeof candidate === 'string' && /^https?:\/\//i.test(candidate.trim())) {
        return candidate.trim();
      }
    }

    for (const nested of Object.values(payload)) {
      const result = this.findUrl(nested);

      if (result) {
        return result;
      }
    }

    return '';
  }
}
