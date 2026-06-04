import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

const MP_PUBLIC_KEY = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY || '';

const BRAND_ICONS = {
  visa: 'https://api.iconify.design/logos:visa.svg',
  master: 'https://api.iconify.design/logos:mastercard.svg',
  amex: 'https://api.iconify.design/simple-icons:americanexpress.svg?color=%232E77BC',
  elo: 'https://api.iconify.design/simple-icons:elo.svg?color=%23FCCF0D',
  hipercard: 'https://api.iconify.design/simple-icons:hipercard.svg?color=%23B32630',
  diners: 'https://api.iconify.design/simple-icons:dinersclub.svg?color=%23007274',
  discover: 'https://api.iconify.design/simple-icons:discover.svg?color=%23FF6000',
};

function detectCardBrand(bin) {
  if (!bin || bin.length < 2) return null;
  if (bin.startsWith('4')) return 'visa';
  if (/^5[1-5]/.test(bin)) return 'master';
  if (/^3[47]/.test(bin)) return 'amex';
  if (/^6011|^65/.test(bin)) return 'discover';
  if (/^36|^38|^300|^301|^302|^303|^304|^305/.test(bin)) return 'diners';
  if (/^606282|^3841/.test(bin)) return 'hipercard';
  if (/^636368|^438935|^504175|^451416|^509048|^509067|^509049|^509069|^509050|^509074|^509068|^509040|^509045|^509051|^509046|^509066|^509047|^509042|^509052|^509043|^509064|^509041/.test(bin)) return 'elo';
  return null;
}

function loadMercadoPagoSdk() {
  return new Promise((resolve, reject) => {
    if (window.MercadoPago) {
      resolve(window.MercadoPago);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.async = true;
    script.onload = () => {
      if (window.MercadoPago) {
        resolve(window.MercadoPago);
      } else {
        reject(new Error('Mercado Pago SDK carregado mas nao inicializado.'));
      }
    };
    script.onerror = () => reject(new Error('Falha ao carregar Mercado Pago SDK.'));
    document.body.appendChild(script);
  });
}

const MercadoPagoCardPayment = forwardRef(function MercadoPagoCardPayment(
  { total, onBrandDetected, onError },
  ref,
) {
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState('');
  const [cardBrand, setCardBrand] = useState(null);
  const [generating, setGenerating] = useState(false);
  const cardFormRef = useRef(null);
  const brandRef = useRef(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!MP_PUBLIC_KEY || MP_PUBLIC_KEY.includes('xxxxx') || !total || total <= 0) {
      return;
    }

    let active = true;

    async function initMp() {
      try {
        const MercadoPago = await loadMercadoPagoSdk();

        if (!active) return;

        const mp = new MercadoPago(MP_PUBLIC_KEY, { locale: 'pt-BR' });

        if (!mountedRef.current) {
          if (cardFormRef.current) {
            try { cardFormRef.current.unmount(); } catch {}
            cardFormRef.current = null;
          }
          const existingForm = document.getElementById('mp-card-form');
          if (existingForm) existingForm.innerHTML = '';

          const cardForm = mp.cardForm({
            amount: Number(total).toFixed(2),
            autoMount: true,
            processingMode: 'automatic',
            form: {
              id: 'mp-card-form',
              cardholderName: { id: 'mp-card-holderName', placeholder: 'Nome igual ao cartao' },
              cardNumber: { id: 'mp-card-number', placeholder: 'Numero do cartao' },
              expirationDate: { id: 'mp-card-expiration', placeholder: 'MM/AA' },
              securityCode: { id: 'mp-card-cvv', placeholder: 'CVV' },
            },
            callbacks: {
              onFormMounted(error) {
                if (error) {
                  console.warn('[mp-card] erro ao montar formulario:', error);
                }
              },
              onCardNumberBin(bin) {
                const brand = detectCardBrand(bin);
                brandRef.current = brand;
                if (active) setCardBrand(brand);
                if (brand && onBrandDetected) onBrandDetected(brand);
              },
              onValidityChange(error, field) {
                if (field === 'cardNumber' && !error) {
                  if (window.mpqCardBin) {
                    const brand = detectCardBrand(window.mpqCardBin);
                    brandRef.current = brand;
                    if (active) setCardBrand(brand);
                    if (brand && onBrandDetected) onBrandDetected(brand);
                  }
                }
              },
            },
          });

          cardFormRef.current = cardForm;
          mountedRef.current = true;

          if (active) setSdkReady(true);
        }
      } catch (err) {
        if (!active) return;
        const message = err instanceof Error ? err.message : 'Erro ao carregar Mercado Pago.';
        setSdkError(message);
        if (onError) onError(message);
      }
    }

    initMp();

    return () => {
      active = false;
      if (cardFormRef.current) {
        try { cardFormRef.current.unmount(); } catch {}
        cardFormRef.current = null;
      }
      mountedRef.current = false;
      try {
        const formEl = document.getElementById('mp-card-form');
        if (formEl) formEl.innerHTML = '';
      } catch {}
    };
  }, [total]);

  useImperativeHandle(ref, () => ({
    generateCardToken: async () => {
      if (!cardFormRef.current) {
        throw new Error('Formulario de cartao Mercado Pago nao esta pronto.');
      }

      setGenerating(true);

      try {
        const result = await cardFormRef.current.createCardToken();
        const token = result?.id;
        if (!token) {
          throw new Error('Mercado Pago nao gerou token do cartao.');
        }

        const networkId = brandRef.current || detectCardBrand(result?.first_six_digits || '') || undefined;

        return { token, networkId };
      } finally {
        setGenerating(false);
      }
    },
  }));

  if (sdkError) {
    return (
      <div className="payment-note">
        <strong>Pagamento com cartao indisponivel.</strong>
        <p>{sdkError}</p>
      </div>
    );
  }

  if (!sdkReady) {
    return (
      <div className="payment-note">
        <strong>Carregando formulario de cartao...</strong>
        <p>Preparando ambiente seguro Mercado Pago.</p>
      </div>
    );
  }

  return (
    <div className="stripe-card-form mercadopago-card-form">
      <div className="stripe-card-form-heading">
        <strong>Cartao de credito a vista</strong>
      </div>

      <form id="mp-card-form">
        <div className="mp-card-field" id="mp-card-holderName" />

        <div className="mp-card-field-with-icon">
          <div className="mp-card-field" id="mp-card-number" />
          {cardBrand && BRAND_ICONS[cardBrand] ? (
            <img
              src={BRAND_ICONS[cardBrand]}
              alt={cardBrand}
              className="mp-card-brand-icon"
            />
          ) : null}
        </div>

        <div className="mp-card-row">
          <div className="mp-card-field mp-card-field-half" id="mp-card-expiration" />
          <div className="mp-card-field mp-card-field-half" id="mp-card-cvv" />
        </div>
      </form>

      {generating ? (
        <div className="payment-note">
          <strong>Processando cartao...</strong>
        </div>
      ) : null}
    </div>
  );
});

export { MercadoPagoCardPayment };
