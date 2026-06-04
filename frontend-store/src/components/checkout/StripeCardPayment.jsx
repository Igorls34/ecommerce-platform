import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useMemo, useState } from 'react';

const publishableKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY || '';
const stripePromise =
  publishableKey && !publishableKey.includes('xxxxx') ? loadStripe(publishableKey) : null;

function CardPaymentForm({ onConfirmed, onPaymentError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setBusy(true);
    setFeedback('');

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: 'if_required',
    });

    if (result.error) {
      const message = result.error.message || 'Não foi possível confirmar o pagamento.';
      setFeedback(message);
      onPaymentError?.(message);
      setBusy(false);
      return;
    }

    setFeedback('Pagamento enviado para confirmação. Atualizando status do pedido...');
    onConfirmed?.();
    setBusy(false);
  }

  return (
    <form className="stripe-card-form" onSubmit={handleSubmit}>
      <div className="stripe-card-form-heading">
        <strong>Cartao de credito a vista</strong>
      </div>

      <div className="stripe-payment-element-frame">
        <PaymentElement />
      </div>

      {feedback ? <div className="checkout-inline-feedback">{feedback}</div> : null}
      <button type="submit" className="button-primary checkout-submit" disabled={!stripe || busy}>
        {busy ? 'Processando...' : 'Confirmar pagamento'}
      </button>
    </form>
  );
}

export function StripeCardPayment({ clientSecret, onConfirmed, onPaymentError }) {
  const options = useMemo(
    () => ({
      clientSecret,
      appearance: {
        theme: 'flat',
        variables: {
          colorPrimary: '#7b4255',
          colorText: '#4c2634',
          colorTextSecondary: '#8b6572',
          colorBackground: '#fffaf8',
          colorDanger: '#8a312d',
          borderRadius: '14px',
          fontFamily: 'DM Sans, Inter, system-ui, sans-serif',
          spacingUnit: '5px',
        },
        rules: {
          '.Input': {
            border: '1px solid rgba(123, 66, 85, 0.18)',
            boxShadow: 'none',
            padding: '13px 14px',
          },
          '.Input:focus': {
            border: '1px solid rgba(123, 66, 85, 0.48)',
            boxShadow: '0 0 0 4px rgba(218, 178, 182, 0.18)',
          },
          '.Label': {
            color: '#6f4a58',
            fontWeight: '700',
          },
        },
      },
    }),
    [clientSecret],
  );

  if (!stripePromise) {
    return (
      <div className="payment-note">
        <strong>Chave publica Stripe ausente.</strong>
        <p>Configure VITE_STRIPE_PUBLIC_KEY no frontend para habilitar cartao.</p>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="payment-note">
        <strong>Pagamento com cartao indisponivel.</strong>
        <p>Não recebemos o clientSecret da Stripe para este pedido.</p>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      <CardPaymentForm onConfirmed={onConfirmed} onPaymentError={onPaymentError} />
    </Elements>
  );
}
