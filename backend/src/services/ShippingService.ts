import { melhorEnvioAuthService } from './MelhorEnvioAuthService';

export interface ShippingCalculateParams {
  zipCode: string;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  insuranceValue?: number;
}

export interface ShippingOption {
  id: number;
  name: string;
  price: number;
  deadline: number;
  custom?: string;
}

type MelhorEnvioOption = {
  id: number;
  name: string;
  price?: number | string;
  custom_price?: number | string;
  delivery_time?: number;
  custom_delivery_time?: number;
  custom_delivery?: number | string;
  error?: string;
};

export class ShippingService {
  private readonly apiUrl =
    process.env.MELHOR_ENVIO_API_URL || 'https://sandbox.melhorenvio.com.br/api/v2/me';
  private readonly userAgent =
    process.env.MELHOR_ENVIO_USER_AGENT || 'Thessara-Store/1.0 (thessarasemijoias@gmail.com)';
  private readonly originZipCode = process.env.STORE_ZIP_CODE || '27250247';
  private readonly defaultWeight = Number(process.env.STORE_WEIGHT) || 0.5;
  private readonly defaultLength = Number(process.env.STORE_LENGTH) || 20;
  private readonly defaultWidth = Number(process.env.STORE_WIDTH) || 15;
  private readonly defaultHeight = Number(process.env.STORE_HEIGHT) || 10;
  private readonly defaultInsuranceValue = Number(process.env.STORE_INSURANCE_VALUE) || 100;

  async calculateShipping(params: ShippingCalculateParams): Promise<ShippingOption[]> {
    const zipCode = this.normalizeZipCode(params.zipCode);
    const originZipCode = this.normalizeZipCode(this.originZipCode);
    const weight = params.weight || this.defaultWeight;
    const length = params.length || this.defaultLength;
    const width = params.width || this.defaultWidth;
    const height = params.height || this.defaultHeight;
    const insuranceValue = params.insuranceValue || this.defaultInsuranceValue;

    if (!zipCode || zipCode.length !== 8) {
      throw new Error('CEP inválido. Use formato XXXXXXXX (8 dígitos)');
    }

    if (!originZipCode || originZipCode.length !== 8) {
      throw new Error('STORE_ZIP_CODE invalido. Use formato XXXXXXXX (8 dígitos)');
    }

    if (weight <= 0 || length <= 0 || width <= 0 || height <= 0) {
      throw new Error('Peso e dimensoes devem ser maiores que zero');
    }

    const response = await this.requestCalculate({
      method: 'POST',
      body: JSON.stringify({
        from: {
          postal_code: originZipCode,
        },
        to: {
          postal_code: zipCode,
        },
        products: [
          {
            id: 'default-package',
            width,
            height,
            length,
            weight,
            quantity: 1,
            insurance_value: insuranceValue,
          },
        ],
        options: {
          receipt: false,
          own_hand: false,
          collect: false,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Erro na API Melhor Envio:', {
        status: response.status,
        statusText: response.statusText,
        message:
          typeof errorData?.message === 'string' || typeof errorData?.error === 'string'
            ? errorData.message || errorData.error
            : '',
      });

      if (response.status === 401) {
        throw new Error('Erro de autenticação no Melhor Envio. Verifique o token.');
      }

      if (response.status === 403) {
        throw new Error(
          'Erro de ambiente. Confira se token e API_URL são ambos sandbox ou ambos produção.',
        );
      }

      throw new Error('Não foi possível calcular o frete para este CEP agora.');
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Nenhuma opção de frete disponível para este CEP');
    }

    const options = data
      .filter((option: MelhorEnvioOption) => !option.error)
      .map((option: MelhorEnvioOption) => {
        const price = this.parsePrice(option.custom_price ?? option.price);
        const deadline = Number(option.custom_delivery_time ?? option.delivery_time ?? 0);

        return {
          id: option.id,
          name: this.formatShippingName(option.name),
          price,
          deadline,
          custom: option.custom_delivery_time ? `${option.custom_delivery_time} dias` : undefined,
        };
      })
      .filter((option: ShippingOption) => option.price > 0);

    if (!options.length) {
      throw new Error('Nenhuma opção de frete disponível para este CEP');
    }

    return options;
  }

  private normalizeZipCode(zipCode: string): string {
    return String(zipCode || '')
      .replace(/[^\d]/g, '')
      .slice(0, 8);
  }

  private parsePrice(value: number | string | undefined): number {
    const price = Number(String(value || '0').replace(',', '.'));
    return Number.isFinite(price) ? Math.round(price * 100) / 100 : 0;
  }

  private formatShippingName(name: string): string {
    const nameMap: Record<string, string> = {
      'Correios - Sedex': 'Sedex',
      'Correios - PAC': 'PAC',
      'Correios - Mini Envios': 'Mini Envios',
      Loggi: 'Loggi',
      Jadlog: 'Jadlog',
      'Azul Cargo Express': 'Azul Cargo',
      'LATAM Cargo': 'LATAM Cargo',
      Buslog: 'Buslog',
      'J&T': 'J&T',
      'Total Express': 'Total Express',
    };

    return nameMap[name] || name;
  }

  private async requestCalculate(init: RequestInit, retryAfterRefresh = true): Promise<Response> {
    const token = await melhorEnvioAuthService.getAccessToken();
    const response = await fetch(`${this.apiUrl.replace(/\/$/, '')}/shipment/calculate`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': this.userAgent,
        ...(init.headers || {}),
      },
    });

    if (response.status === 401 && retryAfterRefresh) {
      await melhorEnvioAuthService.refreshAfterUnauthorized();
      return this.requestCalculate(init, false);
    }

    return response;
  }
}
