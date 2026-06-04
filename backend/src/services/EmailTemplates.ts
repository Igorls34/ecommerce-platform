export type EmailTemplateResult = {
  subject: string;
  html: string;
  text: string;
};

export type EmailOrderTemplateData = {
  orderNumber: string;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  total?: string;
  statusLabel?: string;
  paymentMethodLabel?: string;
  trackingCode?: string | null;
  trackingUrl?: string;
  adminUrl?: string;
  itemsText?: string;
  itemsHtml?: string;
  shippingAddressText?: string;
  shippingService?: string;
  orderNotes?: string | null;
  reason?: string;
};

export type OperationalEmailTemplateData = {
  title: string;
  intro: string;
  rows?: Array<{ label: string; value?: string | null }>;
  button?: { label: string; url?: string };
};

import { brand } from '../lib/brand';

const BRAND_NAME = brand.name;
const CONTACT_EMAIL = brand.email.contact;

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function paragraph(lines: Array<string | null | undefined>) {
  return lines.filter(Boolean).join('\n\n');
}

function baseTemplate({
  title,
  intro,
  rows = [],
  button,
  footerNote,
}: {
  title: string;
  intro: string;
  rows?: Array<{ label: string; value?: string | null }>;
  button?: { label: string; url?: string };
  footerNote?: string;
}) {
  const rowsHtml = rows
    .filter((row) => row.value)
    .map(
      (row) => `
        <tr>
          <td style="padding:12px 0;color:#7d6f65;font-size:13px;border-bottom:1px solid #efe6de;">${escapeHtml(row.label)}</td>
          <td style="padding:12px 0;color:#25201d;font-size:14px;font-weight:700;text-align:right;border-bottom:1px solid #efe6de;">${escapeHtml(row.value)}</td>
        </tr>`,
    )
    .join('');

  const buttonHtml =
    button?.url
      ? `<a href="${escapeHtml(button.url)}" style="display:inline-block;padding:14px 22px;border-radius:12px;background:#2f241f;color:#fffaf6;text-decoration:none;font-weight:700;">${escapeHtml(button.label)}</a>`
      : '';

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3eee8;font-family:Arial,Helvetica,sans-serif;color:#25201d;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3eee8;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fffaf6;border:1px solid #e4d8cc;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:26px 30px 22px;background:#2f241f;text-align:left;">
                <div style="font-family:Georgia,'Times New Roman',serif;font-size:28px;letter-spacing:4px;color:#fffaf6;font-weight:700;">${BRAND_NAME.toUpperCase()}</div>
                <div style="margin-top:8px;color:#d6c6b8;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Joias e acessórios femininos</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 30px 12px;">
                <h1 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.12;color:#25201d;font-weight:500;">${escapeHtml(title)}</h1>
                <p style="margin:0;color:#5e534c;font-size:15px;line-height:1.7;white-space:pre-line;">${escapeHtml(intro)}</p>
              </td>
            </tr>
            ${
              rowsHtml
                ? `<tr><td style="padding:16px 30px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fbf7f2;border:1px solid #efe6de;border-radius:14px;padding:4px 16px;">${rowsHtml}</table></td></tr>`
                : ''
            }
            ${
              buttonHtml
                ? `<tr><td style="padding:16px 30px 30px;text-align:left;">${buttonHtml}</td></tr>`
                : ''
            }
            <tr>
              <td style="padding:22px 30px;background:#eee5dc;color:#6f6259;font-size:12px;line-height:1.65;">
                <p style="margin:0 0 8px;">Atenciosamente,<br />Equipe ${BRAND_NAME}</p>
                <p style="margin:0;">${escapeHtml(
                  footerNote ||
                    `Este e-mail é automático. Se precisar de ajuda, entre em contato pelo e-mail ${CONTACT_EMAIL}.`,
                )}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function textTemplate(title: string, body: string, rows: Array<{ label: string; value?: string | null }>, button?: { label: string; url?: string }) {
  const rowsText = rows
    .filter((row) => row.value)
    .map((row) => `${row.label}: ${row.value}`)
    .join('\n');

  return paragraph([
    BRAND_NAME,
    title,
    body,
    rowsText || null,
    button?.url ? `${button.label}: ${button.url}` : null,
    `Atenciosamente,\nEquipe ${BRAND_NAME}`,
    `Este e-mail é automático. Se precisar de ajuda, entre em contato pelo e-mail ${CONTACT_EMAIL}.`,
  ]);
}

export function paymentConfirmedCustomerTemplate(data: EmailOrderTemplateData): EmailTemplateResult {
  const subject = `Pagamento confirmado - Pedido ${data.orderNumber}`;
  const needsReview = String(data.statusLabel || '').toLowerCase().includes('revisão');
  const intro = needsReview
    ? `Olá, ${data.customerName || 'cliente'}.\n\nRecebemos o pagamento do seu pedido ${data.orderNumber}. Nossa equipe vai revisar um detalhe do pedido e entrará em contato se for necessário.`
    : `Olá, ${data.customerName || 'cliente'}.\n\nRecebemos o pagamento do seu pedido ${data.orderNumber}. Seu pedido agora entrou em preparação. Assim que ele for enviado, você receberá o código de rastreio.`;
  const rows = [
    { label: 'Pedido', value: data.orderNumber },
    { label: 'Total', value: data.total },
    { label: 'Status', value: data.statusLabel || 'Pagamento confirmado' },
  ];
  const button = { label: 'Acompanhar pedido', url: data.trackingUrl };

  return {
    subject,
    html: baseTemplate({ title: 'Pagamento confirmado', intro, rows, button }),
    text: textTemplate('Pagamento confirmado', intro, rows, button),
  };
}

export function paymentConfirmedAdminTemplate(data: EmailOrderTemplateData): EmailTemplateResult {
  const subject = `Pagamento aprovado - separar pedido ${data.orderNumber}`;
  const intro = `Novo pedido pago na loja Thessara.\n\nEste pedido já teve o pagamento confirmado e pode entrar no fluxo de separação.`;
  const rows = [
    { label: 'Pedido', value: data.orderNumber },
    { label: 'Cliente', value: data.customerName || '-' },
    { label: 'E-mail', value: data.customerEmail || '-' },
    { label: 'Telefone', value: data.customerPhone || '-' },
    { label: 'Total', value: data.total },
    { label: 'Pagamento', value: data.paymentMethodLabel || '-' },
    { label: 'Endereço', value: data.shippingAddressText || '-' },
    { label: 'Frete', value: data.shippingService || '-' },
    { label: 'Itens', value: data.itemsText || '-' },
    { label: 'Observações', value: data.orderNotes || null },
  ];
  const button = { label: 'Abrir pedido no admin', url: data.adminUrl };

  return {
    subject,
    html: baseTemplate({ title: 'Pagamento aprovado', intro, rows, button }),
    text: textTemplate('Pagamento aprovado', intro, rows, button),
  };
}

export function pendingOrderAdminTemplate(data: EmailOrderTemplateData): EmailTemplateResult {
  const subject = `Novo pedido pendente - ${data.orderNumber}`;
  const intro =
    'Um novo pedido foi criado na loja, mas ainda aguarda confirmação de pagamento.\n\nEste pedido ainda não foi pago. Aguarde a confirmacao do pagamento antes de separar ou enviar o produto.';
  const rows = [
    { label: 'Pedido', value: data.orderNumber },
    { label: 'Cliente', value: data.customerName || '-' },
    { label: 'E-mail', value: data.customerEmail || '-' },
    { label: 'Total', value: data.total },
    { label: 'Pagamento', value: data.paymentMethodLabel || '-' },
    { label: 'Status', value: data.statusLabel || 'Aguardando pagamento' },
    { label: 'Itens', value: data.itemsText || '-' },
  ];
  const button = { label: 'Abrir pedido no admin', url: data.adminUrl };

  return {
    subject,
    html: baseTemplate({ title: 'Pedido pendente', intro, rows, button }),
    text: textTemplate('Pedido pendente', intro, rows, button),
  };
}

export function paymentFailedCustomerTemplate(data: EmailOrderTemplateData): EmailTemplateResult {
  const subject = 'Não conseguimos confirmar seu pagamento';
  const intro = `Olá, ${data.customerName || 'cliente'}.\n\nNão conseguimos confirmar o pagamento do pedido ${data.orderNumber}. Voce pode tentar novamente acessando sua conta ou entrar em contato com a loja.`;
  const rows = [
    { label: 'Pedido', value: data.orderNumber },
    { label: 'Motivo', value: data.reason || 'Pagamento não aprovado' },
  ];
  const button = { label: 'Ver pedido', url: data.trackingUrl };

  return {
    subject,
    html: baseTemplate({ title: 'Pagamento não aprovado', intro, rows, button }),
    text: textTemplate('Pagamento não aprovado', intro, rows, button),
  };
}

export function orderStatusUpdateCustomerTemplate(data: EmailOrderTemplateData): EmailTemplateResult {
  const subject = `Atualização do seu pedido ${data.orderNumber}`;
  const statusMessage: Record<string, string> = {
    'Em separação': 'Seu pedido esta sendo preparado com cuidado.',
    Embalado: 'Seu pedido foi embalado e esta quase pronto para envio.',
    'Etiqueta gerada': 'A etiqueta de envio foi gerada.',
    Postado: 'Seu pedido foi postado e seguirá para entrega.',
    'Em transporte': 'Seu pedido esta em transporte.',
    Entregue: 'Seu pedido foi entregue. Esperamos que você ame sua compra.',
  };
  const intro = `Olá, ${data.customerName || 'cliente'}.\n\nO status do seu pedido foi atualizado.\n\n${statusMessage[data.statusLabel || ''] || 'Acompanhe os detalhes pelo link abaixo.'}`;
  const rows = [
    { label: 'Pedido', value: data.orderNumber },
    { label: 'Status', value: data.statusLabel },
    { label: 'Rastreio', value: data.trackingCode || null },
  ];
  const button = { label: 'Acompanhar pedido', url: data.trackingUrl };

  return {
    subject,
    html: baseTemplate({ title: 'Atualizacao do pedido', intro, rows, button }),
    text: textTemplate('Atualizacao do pedido', intro, rows, button),
  };
}

export function trackingCodeCustomerTemplate(data: EmailOrderTemplateData): EmailTemplateResult {
  const subject = 'Seu pedido foi enviado - rastreio disponível';
  const intro = `Olá, ${data.customerName || 'cliente'}.\n\nSeu pedido ${data.orderNumber} foi enviado. Use o código de rastreio abaixo para acompanhar a entrega.`;
  const rows = [
    { label: 'Pedido', value: data.orderNumber },
    { label: 'Código de rastreio', value: data.trackingCode || '-' },
  ];
  const button = { label: 'Acompanhar pedido', url: data.trackingUrl };

  return {
    subject,
    html: baseTemplate({ title: 'Rastreio disponível', intro, rows, button }),
    text: textTemplate('Rastreio disponível', intro, rows, button),
  };
}

export function paymentExpiredCustomerTemplate(data: EmailOrderTemplateData): EmailTemplateResult {
  const subject = 'O pagamento do seu pedido expirou';
  const intro = `Olá, ${data.customerName || 'cliente'}.\n\nO pagamento do pedido ${data.orderNumber} expirou. Você pode acessar sua conta para verificar o pedido ou refazer a compra.`;
  const rows = [
    { label: 'Pedido', value: data.orderNumber },
    { label: 'Status', value: 'Pagamento expirado' },
  ];
  const button = { label: 'Ver minha conta', url: data.trackingUrl };

  return {
    subject,
    html: baseTemplate({ title: 'Pagamento expirado', intro, rows, button }),
    text: textTemplate('Pagamento expirado', intro, rows, button),
  };
}

export function passwordResetTemplate(resetUrl: string): EmailTemplateResult {
  const subject = 'Recupere sua senha - Thessara';
  const intro =
    'Recebemos uma solicitação para redefinir sua senha.\n\nClique no botão abaixo para criar uma nova senha. Se você não solicitou isso, ignore este e-mail.';
  const button = { label: 'Redefinir senha', url: resetUrl };

  return {
    subject,
    html: baseTemplate({ title: 'Recupere sua senha', intro, button }),
    text: textTemplate('Recupere sua senha', intro, [], button),
  };
}

export function operationalAdminTemplate(data: OperationalEmailTemplateData): EmailTemplateResult {
  const rows = data.rows || [];

  return {
    subject: data.title,
    html: baseTemplate({
      title: data.title,
      intro: data.intro,
      rows,
      button: data.button,
    }),
    text: textTemplate(data.title, data.intro, rows, data.button),
  };
}
