import { formatCurrency } from '../../lib/formatters';
import { resolveAssetUrl } from '../../lib/assets';

export const FREE_SHIPPING_MINIMUM = 0;
export const SHIPPING_PRICE = 0;
export const PIX_DISCOUNT_RATE = 0.05;

export function calculateCheckoutTotals(items, paymentMethod, selectedShipping = null) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = selectedShipping ? Number(selectedShipping.price || 0) : SHIPPING_PRICE;
  const discount = paymentMethod === 'pix' ? subtotal * PIX_DISCOUNT_RATE : 0;
  const total = Math.max(0, subtotal + shipping - discount);

  return {
    subtotal,
    shipping,
    discount,
    total,
  };
}

export function OrderSummary({
  busy,
  disabled = false,
  items,
  onSubmit,
  onToggleSummary,
  paymentMethod,
  selectedShipping,
  summaryOpen = false,
  submitLabel,
}) {
  const totals = calculateCheckoutTotals(items, paymentMethod, selectedShipping);
  const defaultSubmitLabel = paymentMethod === 'pix' ? 'Gerar pedido e pagar' : 'Finalizar Compra';

  return (
    <aside className={`content-panel checkout-summary order-summary${summaryOpen ? ' is-open' : ''}`}>
      <button type="button" className="checkout-summary-toggle" onClick={onToggleSummary}>
        <span>Resumo do pedido</span>
        <strong>{formatCurrency(totals.total)}</strong>
      </button>

      <div className="checkout-summary-content">
        <p className="section-eyebrow">Resumo</p>
        <h2>Pedido</h2>

        <div className="summary-product-list order-summary__product-list">
          {items.map((item) => (
            <article key={item.id} className="summary-product order-summary__product">
              <div className="summary-product-thumb order-summary__product-thumb">
                {item.imageUrl ? (
                  <img src={resolveAssetUrl(item.imageUrl)} alt={item.name} />
                ) : (
                  <span>{item.quantity}</span>
                )}
              </div>
              <div>
                <strong>{item.name}</strong>
                {item.variantName ? <span>Tamanho: {item.variantName}</span> : null}
                <span>{item.quantity} unidade(s)</span>
              </div>
              <p>{formatCurrency(item.price * item.quantity)}</p>
            </article>
          ))}
        </div>

        <div className="summary-totals order-summary__totals">
          <div>
            <span>Subtotal</span>
            <strong>{formatCurrency(totals.subtotal)}</strong>
          </div>
          <div className={selectedShipping ? 'summary-shipping-selected' : ''}>
            <span>Entrega</span>
            <strong>
              {selectedShipping ? formatCurrency(totals.shipping) : 'Escolha no checkout'}
            </strong>
          </div>
          {selectedShipping?.deadline ? (
            <div className="summary-shipping-selected">
              <span>Prazo estimado</span>
              <strong>{selectedShipping.deadline} dia(s)</strong>
            </div>
          ) : null}
          {totals.discount > 0 ? (
            <div className="summary-discount">
              <span>Desconto PIX</span>
              <strong>-{formatCurrency(totals.discount)}</strong>
            </div>
          ) : null}
        </div>

        <div className="summary-grand-total order-summary__grand-total">
          <span>Total</span>
          <strong>{formatCurrency(totals.total)}</strong>
        </div>

        <button
          type="button"
          className="button-primary checkout-submit order-summary__submit"
          disabled={busy || disabled}
          onClick={onSubmit}
        >
          {busy ? 'Gerando pedido...' : submitLabel || defaultSubmitLabel}
        </button>
      </div>
    </aside>
  );
}
