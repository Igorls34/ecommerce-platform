const paymentOptions = [
  {
    value: 'pix',
    label: 'PIX',
    description: '5% de desconto',
    available: true,
    iconUrl: 'https://api.iconify.design/simple-icons:pix.svg?color=%237b4255',
    activeIconUrl: 'https://api.iconify.design/simple-icons:pix.svg?color=%23ffffff',
  },
  // Futuro: separar cartao de debito quando a conta/gateway garantir suporte e regras proprias.
  // Futuro: habilitar parcelamento real somente com gateway que confirme parcelas no pagamento
  // (ex.: Pagar.me/Mercado Pago/Asaas ou recurso equivalente da conta de pagamento).
  {
    value: 'card',
    label: 'Cartao de credito',
    description: 'A vista',
    available: false,
    iconUrl: 'https://api.iconify.design/lucide:credit-card.svg?color=%237b4255',
    activeIconUrl: 'https://api.iconify.design/lucide:credit-card.svg?color=%23ffffff',
  },
];

export function PaymentMethods({ paymentRegistration, setValue, watch }) {
  const paymentMethod = watch('paymentMethod');

  return (
    <>
      <div className="payment-tabs" role="tablist" aria-label="Metodo de pagamento">
        {paymentOptions.map((option) => {
          const isSelected = paymentMethod === option.value;

          return (
            <label
              key={option.value}
              className={`payment-tab${isSelected ? ' is-active' : ''}${!option.available ? ' is-disabled' : ''}`}
              aria-selected={isSelected}
            >
              <input
                type="radio"
                {...paymentRegistration}
                value={option.value}
                checked={isSelected}
                disabled={!option.available}
                onChange={(event) => {
                  paymentRegistration.onChange(event);

                  if (option.available) {
                    setValue('paymentMethod', option.value, {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    });
                  }
                }}
              />
              <span className="payment-tab-icon" aria-hidden="true">
                <img src={isSelected ? option.activeIconUrl : option.iconUrl} alt="" loading="lazy" />
              </span>
              <span className="payment-tab-copy">
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </span>
            </label>
          );
        })}
      </div>

      {paymentMethod === 'pix' ? (
        <div className="pix-payment-box">
          <div className="payment-note is-highlight">
            <strong>Ao finalizar, o QR Code PIX aparece na proxima tela.</strong>
          </div>
        </div>
      ) : null}
    </>
  );
}
