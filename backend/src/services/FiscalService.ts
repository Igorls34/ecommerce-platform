import { Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma';

type FiscalOrder = Prisma.OrderGetPayload<{
  include: {
    customer: true;
    items: {
      include: {
        variant: true;
        product: {
          include: {
            category: true;
          };
        };
      };
    };
    fiscalDocuments: true;
  };
}>;

export type FiscalIntegrationStatus = {
  enabled: boolean;
  provider: string;
  environment: string;
  configured: boolean;
  realIssueEnabled: boolean;
  documentType: string;
  missingConfig: string[];
  message: string;
};

type FocusNFeResponse = Record<string, any>;

const FOCUS_PROVIDER_NAMES = new Set(['focus', 'focus_nfe', 'focusnfe']);
const PAYMENT_CONFIRMED_STATUSES = new Set([
  'PAID',
  'PAID_STOCK_ISSUE',
  'PREPARING',
  'PACKED',
  'LABEL_GENERATED',
  'POSTED',
  'SHIPPED',
  'DELIVERED',
]);

function getProvider() {
  return String(process.env.FISCAL_PROVIDER || 'disabled').trim().toLowerCase();
}

function getDocumentType() {
  return String(process.env.FISCAL_DOCUMENT_TYPE || process.env.FOCUS_NFE_DOCUMENT_TYPE || 'nfe')
    .trim()
    .toLowerCase();
}

function getFocusApiUrl() {
  return String(
    process.env.FOCUS_NFE_API_URL ||
      process.env.FISCAL_API_URL ||
      'https://api.focusnfe.com.br/v2',
  ).replace(/\/$/, '');
}

function getApiToken() {
  return process.env.FOCUS_NFE_API_TOKEN || process.env.FISCAL_API_TOKEN || '';
}

function getRealIssueEnabled() {
  return String(process.env.FOCUS_NFE_REAL_ISSUE_ENABLED || 'false').toLowerCase() === 'true';
}

function digitsOnly(value: unknown) {
  return String(value || '').replace(/\D/g, '');
}

function parseJsonObject(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function getRequiredConfig() {
  return {
    token: getApiToken(),
    naturezaOperacao: process.env.FOCUS_NFE_NATUREZA_OPERACAO || '',
    emitenteNome: process.env.FOCUS_NFE_EMITENTE_NOME || '',
    emitenteDocumento:
      process.env.FOCUS_NFE_EMITENTE_CNPJ || process.env.FOCUS_NFE_EMITENTE_CPF || '',
    emitenteLogradouro: process.env.FOCUS_NFE_EMITENTE_LOGRADOURO || '',
    emitenteNumero: process.env.FOCUS_NFE_EMITENTE_NUMERO || '',
    emitenteBairro: process.env.FOCUS_NFE_EMITENTE_BAIRRO || '',
    emitenteMunicipio: process.env.FOCUS_NFE_EMITENTE_MUNICIPIO || '',
    emitenteUf: process.env.FOCUS_NFE_EMITENTE_UF || '',
    emitenteCep: process.env.FOCUS_NFE_EMITENTE_CEP || '',
    regimeTributario: process.env.FOCUS_NFE_REGIME_TRIBUTARIO || '',
    serie: process.env.FOCUS_NFE_SERIE || '',
    cfop: process.env.FOCUS_NFE_DEFAULT_CFOP || '',
    ncm: process.env.FOCUS_NFE_DEFAULT_NCM || '',
    origem: process.env.FOCUS_NFE_DEFAULT_ORIGEM || '',
    csosn: process.env.FOCUS_NFE_DEFAULT_CSOSN || '',
  };
}

function getMissingConfig() {
  const config = getRequiredConfig();
  const labels: Record<keyof typeof config, string> = {
    token: 'FOCUS_NFE_API_TOKEN',
    naturezaOperacao: 'FOCUS_NFE_NATUREZA_OPERACAO',
    emitenteNome: 'FOCUS_NFE_EMITENTE_NOME',
    emitenteDocumento: 'FOCUS_NFE_EMITENTE_CNPJ ou FOCUS_NFE_EMITENTE_CPF',
    emitenteLogradouro: 'FOCUS_NFE_EMITENTE_LOGRADOURO',
    emitenteNumero: 'FOCUS_NFE_EMITENTE_NUMERO',
    emitenteBairro: 'FOCUS_NFE_EMITENTE_BAIRRO',
    emitenteMunicipio: 'FOCUS_NFE_EMITENTE_MUNICIPIO',
    emitenteUf: 'FOCUS_NFE_EMITENTE_UF',
    emitenteCep: 'FOCUS_NFE_EMITENTE_CEP',
    regimeTributario: 'FOCUS_NFE_REGIME_TRIBUTARIO',
    serie: 'FOCUS_NFE_SERIE',
    cfop: 'FOCUS_NFE_DEFAULT_CFOP',
    ncm: 'FOCUS_NFE_DEFAULT_NCM',
    origem: 'FOCUS_NFE_DEFAULT_ORIGEM',
    csosn: 'FOCUS_NFE_DEFAULT_CSOSN',
  };

  return Object.entries(config)
    .filter(([, value]) => !String(value || '').trim())
    .map(([key]) => labels[key as keyof typeof labels]);
}

function buildReference(orderId: number) {
  const prefix = String(process.env.FOCUS_NFE_REF_PREFIX || 'pedido').trim() || 'pedido';
  return `${prefix}-${orderId}`;
}

function mapFocusStatus(status: unknown) {
  const normalized = String(status || '').toLowerCase();

  if (normalized === 'autorizado') {
    return 'authorized';
  }

  if (normalized === 'cancelado') {
    return 'canceled';
  }

  if (normalized.includes('erro') || normalized.includes('reje')) {
    return 'rejected';
  }

  if (normalized.includes('process')) {
    return 'issuing';
  }

  return normalized || 'issuing';
}

function extractFiscalUrls(response: FocusNFeResponse) {
  const xmlPath =
    response.caminho_xml_nota_fiscal ||
    response.caminho_xml ||
    response.xml ||
    response.xml_url ||
    '';
  const danfePath =
    response.caminho_danfe ||
    response.danfe ||
    response.danfe_url ||
    response.pdf ||
    response.pdf_url ||
    '';
  const apiUrl = getFocusApiUrl();

  return {
    xmlUrl: xmlPath ? (String(xmlPath).startsWith('http') ? String(xmlPath) : `${apiUrl}${xmlPath}`) : null,
    danfeUrl: danfePath
      ? String(danfePath).startsWith('http')
        ? String(danfePath)
        : `${apiUrl}${danfePath}`
      : null,
  };
}

export class FiscalService {
  getStatus(): FiscalIntegrationStatus {
    const provider = getProvider();
    const enabled = provider !== 'disabled';
    const isFocus = FOCUS_PROVIDER_NAMES.has(provider);
    const missingConfig = enabled && isFocus ? getMissingConfig() : [];
    const configured = Boolean(enabled && isFocus && getApiToken());
    const realIssueEnabled = getRealIssueEnabled();

    return {
      enabled,
      provider,
      environment: process.env.FISCAL_ENVIRONMENT || process.env.FOCUS_NFE_ENVIRONMENT || 'sandbox',
      configured,
      realIssueEnabled,
      documentType: getDocumentType(),
      missingConfig,
      message: !enabled
        ? 'Emissão fiscal preparada, mas desativada até definição das regras com contador.'
        : !isFocus
          ? 'Provedor fiscal não suportado por esta implementação.'
          : missingConfig.length
            ? 'Focus NFe parcialmente configurado. Complete as regras fiscais antes de emitir.'
            : realIssueEnabled
              ? 'Focus NFe configurado para emissão real.'
              : 'Focus NFe configurado em modo seguro. A emissão real ainda está bloqueada.',
    };
  }

  async getOrderDocuments(orderId: number) {
    return prisma.fiscalDocument.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async prepareOrderDocument(orderId: number) {
    const order = await this.fetchOrder(orderId);
    const reference = buildReference(order.id);
    const payload = this.buildNFePayload(order);
    const status = this.getStatus();
    const documentStatus = status.missingConfig.length ? 'pending_config' : 'ready_to_issue';

    const existing = await prisma.fiscalDocument.findFirst({
      where: {
        orderId: order.id,
        provider: 'focus_nfe',
        externalId: reference,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      return prisma.fiscalDocument.update({
        where: { id: existing.id },
        data: {
          documentType: getDocumentType(),
          status: existing.status === 'authorized' ? existing.status : documentStatus,
          requestPayload: payload as Prisma.InputJsonValue,
          errorMessage: status.missingConfig.length
            ? `Configuração fiscal pendente: ${status.missingConfig.join(', ')}.`
            : null,
          lastSyncedAt: new Date(),
        },
      });
    }

    return prisma.fiscalDocument.create({
      data: {
        orderId: order.id,
        provider: 'focus_nfe',
        documentType: getDocumentType(),
        status: documentStatus,
        externalId: reference,
        series: process.env.FOCUS_NFE_SERIE || null,
        requestPayload: payload as Prisma.InputJsonValue,
        errorMessage: status.missingConfig.length
          ? `Configuração fiscal pendente: ${status.missingConfig.join(', ')}.`
          : null,
        lastSyncedAt: new Date(),
      },
    });
  }

  async issueOrderDocument(orderId: number) {
    const status = this.getStatus();

    if (!status.enabled || status.provider === 'disabled') {
      throw new Error(status.message);
    }

    if (!FOCUS_PROVIDER_NAMES.has(status.provider)) {
      throw new Error('Somente Focus NFe está implementado para emissão fiscal.');
    }

    if (status.missingConfig.length) {
      throw new Error(`Configuração fiscal pendente: ${status.missingConfig.join(', ')}.`);
    }

    if (!status.realIssueEnabled) {
      throw new Error(
        'Emissão real bloqueada. Defina FOCUS_NFE_REAL_ISSUE_ENABLED=true somente após validação do contador e testes em homologação.',
      );
    }

    const document = await this.prepareOrderDocument(orderId);
    const payload = parseJsonObject(document.requestPayload);
    const reference = document.externalId || buildReference(orderId);
    const response = await this.focusRequest(`/${getDocumentType()}?ref=${encodeURIComponent(reference)}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return this.updateDocumentFromFocusResponse(document.id, response);
  }

  async syncOrderDocument(orderId: number, documentId?: number) {
    const document = documentId
      ? await prisma.fiscalDocument.findFirst({ where: { id: documentId, orderId } })
      : await prisma.fiscalDocument.findFirst({
          where: { orderId, provider: 'focus_nfe' },
          orderBy: { createdAt: 'desc' },
        });

    if (!document) {
      throw new Error('Documento fiscal não encontrado para este pedido.');
    }

    if (!document.externalId) {
      throw new Error('Documento fiscal ainda não possui referência externa.');
    }

    const response = await this.focusRequest(
      `/${document.documentType || getDocumentType()}/${encodeURIComponent(document.externalId)}?completa=1`,
      { method: 'GET' },
    );

    return this.updateDocumentFromFocusResponse(document.id, response);
  }

  private async fetchOrder(orderId: number): Promise<FiscalOrder> {
    if (Number.isNaN(orderId)) {
      throw new Error('ID do pedido inválido.');
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        fiscalDocuments: true,
        items: {
          include: {
            variant: true,
            product: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new Error('Pedido não encontrado.');
    }

    if (!PAYMENT_CONFIRMED_STATUSES.has(String(order.status))) {
      throw new Error('A nota fiscal só deve ser preparada após confirmação do pagamento.');
    }

    return order;
  }

  private buildNFePayload(order: FiscalOrder) {
    const shippingAddress = parseJsonObject(order.shippingAddress);
    const customerDocument = digitsOnly(
      shippingAddress.recipientDocument || order.customer?.cpf || '',
    );
    const emitenteCnpj = digitsOnly(process.env.FOCUS_NFE_EMITENTE_CNPJ);
    const emitenteCpf = digitsOnly(process.env.FOCUS_NFE_EMITENTE_CPF);
    const now = new Date().toISOString();

    return {
      natureza_operacao: process.env.FOCUS_NFE_NATUREZA_OPERACAO || '',
      data_emissao: now,
      data_entrada_saida: now,
      tipo_documento: Number(process.env.FOCUS_NFE_TIPO_DOCUMENTO || 1),
      finalidade_emissao: Number(process.env.FOCUS_NFE_FINALIDADE_EMISSAO || 1),
      consumidor_final: Number(process.env.FOCUS_NFE_CONSUMIDOR_FINAL || 1),
      presenca_comprador: Number(process.env.FOCUS_NFE_PRESENCA_COMPRADOR || 2),
      ...(emitenteCnpj ? { cnpj_emitente: emitenteCnpj } : {}),
      ...(emitenteCpf ? { cpf_emitente: emitenteCpf } : {}),
      nome_emitente: process.env.FOCUS_NFE_EMITENTE_NOME || '',
      nome_fantasia_emitente: process.env.FOCUS_NFE_EMITENTE_NOME_FANTASIA || '',
      logradouro_emitente: process.env.FOCUS_NFE_EMITENTE_LOGRADOURO || '',
      numero_emitente: process.env.FOCUS_NFE_EMITENTE_NUMERO || '',
      complemento_emitente: process.env.FOCUS_NFE_EMITENTE_COMPLEMENTO || '',
      bairro_emitente: process.env.FOCUS_NFE_EMITENTE_BAIRRO || '',
      municipio_emitente: process.env.FOCUS_NFE_EMITENTE_MUNICIPIO || '',
      uf_emitente: process.env.FOCUS_NFE_EMITENTE_UF || '',
      cep_emitente: digitsOnly(process.env.FOCUS_NFE_EMITENTE_CEP),
      inscricao_estadual_emitente: process.env.FOCUS_NFE_EMITENTE_INSCRICAO_ESTADUAL || '',
      regime_tributario_emitente: Number(process.env.FOCUS_NFE_REGIME_TRIBUTARIO || 1),
      serie: process.env.FOCUS_NFE_SERIE || undefined,
      nome_destinatario: order.customer?.name || 'Cliente não informado',
      email_destinatario: order.customer?.email || undefined,
      telefone_destinatario: digitsOnly(order.customer?.phone),
      ...(customerDocument.length > 11
        ? { cnpj_destinatario: customerDocument }
        : { cpf_destinatario: customerDocument }),
      logradouro_destinatario: shippingAddress.street || '',
      numero_destinatario: shippingAddress.number || '',
      complemento_destinatario: shippingAddress.complement || '',
      bairro_destinatario: shippingAddress.neighborhood || '',
      municipio_destinatario: shippingAddress.city || '',
      uf_destinatario: shippingAddress.state || '',
      cep_destinatario: digitsOnly(shippingAddress.zipCode),
      itens: order.items.map((item, index) => {
        const unitPrice = Number(item.price || 0);
        const quantity = Number(item.quantity || 0);

        return {
          numero_item: index + 1,
          codigo_produto: String(item.variant?.sku || item.productId),
          descricao: item.variant?.name
            ? `${item.product?.name || 'Produto'} - ${item.variant.name}`
            : item.product?.name || 'Produto',
          cfop: process.env.FOCUS_NFE_DEFAULT_CFOP || '',
          ncm: process.env.FOCUS_NFE_DEFAULT_NCM || '',
          unidade_comercial: process.env.FOCUS_NFE_DEFAULT_UNIDADE || 'UN',
          quantidade_comercial: quantity,
          valor_unitario_comercial: unitPrice,
          valor_bruto: unitPrice * quantity,
          unidade_tributavel: process.env.FOCUS_NFE_DEFAULT_UNIDADE || 'UN',
          quantidade_tributavel: quantity,
          valor_unitario_tributavel: unitPrice,
          origem: Number(process.env.FOCUS_NFE_DEFAULT_ORIGEM || 0),
          csosn: process.env.FOCUS_NFE_DEFAULT_CSOSN || '',
        };
      }),
      informacoes_adicionais_contribuinte:
        process.env.FOCUS_NFE_INFORMACOES_ADICIONAIS ||
        `Pedido #${order.id} gerado pelo e-commerce.`,
    };
  }

  private async focusRequest(pathname: string, init: RequestInit) {
    const token = getApiToken();

    if (!token) {
      throw new Error('FOCUS_NFE_API_TOKEN não configurado.');
    }

    const response = await fetch(`${getFocusApiUrl()}${pathname}`, {
      ...init,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${token}:`).toString('base64')}`,
        ...(init.headers || {}),
      },
    });
    const data = (await response.json().catch(() => null)) as FocusNFeResponse | null;

    if (!response.ok) {
      throw new Error(
        data?.mensagem ||
          data?.message ||
          data?.erro ||
          data?.error ||
          `Focus NFe retornou HTTP ${response.status}.`,
      );
    }

    return data || {};
  }

  private async updateDocumentFromFocusResponse(documentId: number, response: FocusNFeResponse) {
    const urls = extractFiscalUrls(response);
    const status = mapFocusStatus(response.status);

    return prisma.fiscalDocument.update({
      where: { id: documentId },
      data: {
        status,
        responsePayload: response as Prisma.InputJsonValue,
        number: response.numero ? String(response.numero) : undefined,
        series: response.serie ? String(response.serie) : undefined,
        accessKey: response.chave_nfe || response.chave_nfce || undefined,
        protocol: response.protocolo || response.protocolo_autorizacao || undefined,
        xmlUrl: urls.xmlUrl,
        danfeUrl: urls.danfeUrl,
        pdfUrl: urls.danfeUrl,
        errorMessage: response.mensagem_sefaz || response.mensagem || null,
        issuedAt: status === 'authorized' ? new Date() : undefined,
        canceledAt: status === 'canceled' ? new Date() : undefined,
        lastSyncedAt: new Date(),
      },
    });
  }
}
