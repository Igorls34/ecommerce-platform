import { formatCurrency } from '../lib/formatters';

function FiscalRow({ label, value, mono }) {
  return (
    <div className="fiscal-row">
      <span>{label}</span>
      <strong className={mono ? 'fiscal-mono' : ''}>{value || '-'}</strong>
    </div>
  );
}

export function FiscalDataPanel({ order }) {
  if (!order) return null;

  const items = order.items || [];
  const address = order.shippingAddress || {};
  const customer = order.customer || {};
  const shipping = address.shippingOption || {};

  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
    0,
  );
  const freight = Number(shipping.price || 0);
  const discount = 0;
  const total = Number(order.total || 0);

  return (
    <section className="panel order-management-panel fiscal-data-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Dados para NF-e</p>
          <h3>Emitir nota fiscal na SEFAZ-RJ</h3>
        </div>
        <span className="fiscal-print-hint">Copie os dados abaixo ou imprima esta seção</span>
      </div>

      <div className="fiscal-grid">
        <div className="fiscal-block">
          <p className="eyebrow">Emitente</p>
          <FiscalRow label="Razão social" value={null} />
          <FiscalRow label="CNPJ" value={null} mono />
          <FiscalRow label="Inscrição Estadual" value={null} mono />
          <FiscalRow label="Regime tributário" value="MEI" />
          <small>Configure razão social e CNPJ em Configurações.</small>
        </div>

        <div className="fiscal-block">
          <p className="eyebrow">Destinatário</p>
          <FiscalRow label="Nome" value={customer.name} />
          <FiscalRow label="CPF/CNPJ" value={address.recipientDocument} mono />
          <FiscalRow
            label="Endereço"
            value={[address.street, address.number, address.complement]
              .filter(Boolean)
              .join(', ')}
          />
          <FiscalRow label="Bairro" value={address.neighborhood} />
          <FiscalRow label="Cidade / UF" value={`${address.city || '-'} / ${address.state || '-'}`} />
          <FiscalRow label="CEP" value={address.zipCode} mono />
          <FiscalRow label="Telefone" value={customer.phone} mono />
          <FiscalRow label="E-mail" value={customer.email} />
        </div>

        <div className="fiscal-block">
          <p className="eyebrow">Pedido</p>
          <FiscalRow label="Nº do pedido" value={`#${order.id}`} mono />
          <FiscalRow label="Data" value={order.createdAt ? new Date(order.createdAt).toLocaleDateString('pt-BR') : '-'} />
          <FiscalRow label="Forma de pagamento" value={order.paymentMethod === 'pix' ? 'PIX' : order.paymentMethod === 'card' ? 'Cartão de crédito' : order.paymentMethod || '-'} />
          <FiscalRow label="Status" value={order.status || '-'} />
        </div>

        <div className="fiscal-block fiscal-block-wide">
          <p className="eyebrow">Produtos</p>
          <div className="fiscal-table">
            <div className="fiscal-table-header">
              <span>Produto</span>
              <span>NCM</span>
              <span>CFOP</span>
              <span>Un</span>
              <span>Qtd</span>
              <span>Vl. Unit</span>
              <span>Vl. Total</span>
            </div>
            {items.map((item, index) => (
              <div key={item.id || index} className="fiscal-table-row">
                <span>
                  {item.product?.name || `Produto #${item.productId}`}
                  {item.variant?.name ? ` - ${item.variant.name}` : ''}
                </span>
                <span className="fiscal-mono">{item.ncm || item.product?.ncm || '-'}</span>
                <span className="fiscal-mono">{item.cfop || '-'}</span>
                <span className="fiscal-mono">{item.unit || item.product?.unit || 'UN'}</span>
                <span className="fiscal-mono">{item.quantity}</span>
                <span className="fiscal-mono">{formatCurrency(item.price)}</span>
                <span className="fiscal-mono">{formatCurrency(Number(item.price) * Number(item.quantity))}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="fiscal-block">
          <p className="eyebrow">Totais</p>
          <FiscalRow label="Subtotal" value={formatCurrency(subtotal)} />
          <FiscalRow label="Frete" value={formatCurrency(freight)} />
          {discount > 0 ? <FiscalRow label="Desconto" value={formatCurrency(discount)} /> : null}
          <FiscalRow label="Total do pedido" value={formatCurrency(total)} />
        </div>

        <div className="fiscal-block">
          <p className="eyebrow">Transporte</p>
          <FiscalRow label="Modalidade" value={shipping.name || '-'} />
          <FiscalRow label="Valor do frete" value={formatCurrency(freight)} />
          <FiscalRow label="Código de rastreio" value={order.trackingCode} mono />
          <FiscalRow label="Peso total" value={order.storeWeight || '-'} />
        </div>
      </div>
    </section>
  );
}
