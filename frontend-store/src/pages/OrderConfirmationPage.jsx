import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';

import { LoadingSpinner } from '../components/LoadingSpinner';
import { createPixQrCode } from '../components/checkout/pix';
import { StripeCardPayment } from '../components/checkout/StripeCardPayment';
import { formatCurrency } from '../lib/formatters';
import {
  completeTestStoreOrderPayment,
  getStoreOrderPayment,
} from '../services/api';
import { useCart } from '../state/CartContext';
import { useStoreAuth } from '../state/StoreAuthContext';

function getCachedPayment(orderId, statePayment) {
  if (statePayment) {
    return statePayment;
  }

  try {
    return JSON.parse(window.sessionStorage.getItem(`payment:${orderId}`) || 'null');
  } catch {
    return null;
  }
}

function mapPaymentFromBackend(data, currentPayment) {
  return {
    ...(currentPayment || {}),
    provider: data.order?.gatewayProvider || currentPayment?.provider,
    paymentMethod: data.paymentMethod || currentPayment?.paymentMethod,
    pixCopyPaste: data.pix?.copyPaste || currentPayment?.pixCopyPaste || '',
    qrCode: data.pix?.qrCode || currentPayment?.qrCode || '',
    clientSecret: data.card?.clientSecret || currentPayment?.clientSecret || '',
    expiresAt: data.expiresAt || currentPayment?.expiresAt,
    ticketUrl: currentPayment?.ticketUrl || currentPayment?.hostedInstructionsUrl || '',
    hostedInstructionsUrl: currentPayment?.hostedInstructionsUrl || currentPayment?.ticketUrl || '',
    paymentIntentId: data.order?.gatewayOrderId || currentPayment?.paymentIntentId || '',
    status: data.paymentStatus,
    statusDetail: data.paymentStatusDetail || data.order?.paymentStatusDetail || currentPayment?.statusDetail,
  };
}

function formatPaymentExpiration(value) {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function OrderTimeline({ steps = [] }) {
  if (!steps.length) {
    return null;
  }

  return (
    <div className="order-timeline" aria-label="Linha do tempo do pedido">
      {steps.map((step) => (
        <div key={step.key} className={`order-timeline-step is-${step.state}`}>
          <span />
          <strong>{step.label}</strong>
        </div>
      ))}
    </div>
  );
}

function buildPaymentTimeline({ isPending, isExpired, isCanceled, isPaid, hasStockIssue }) {
  if (isPaid || hasStockIssue) {
    return [
      { key: 'PAYMENT_CONFIRMED', label: 'Pagamento confirmado', state: 'done' },
      { key: 'PREPARING', label: hasStockIssue ? 'Revisão do pedido' : 'Em preparação', state: 'current' },
      { key: 'LABEL_GENERATED', label: 'Etiqueta gerada', state: 'pending' },
      { key: 'POSTED', label: 'Postado', state: 'pending' },
      { key: 'SHIPPED', label: 'Em transporte', state: 'pending' },
      { key: 'DELIVERED', label: 'Entregue', state: 'pending' },
    ];
  }

  if (isExpired) {
    return [
      { key: 'ORDER_CREATED', label: 'Pedido criado', state: 'done' },
      { key: 'PAYMENT_EXPIRED', label: 'Pagamento expirado', state: 'warning' },
    ];
  }

  if (isCanceled) {
    return [
      { key: 'ORDER_CREATED', label: 'Pedido criado', state: 'done' },
      { key: 'PAYMENT_FAILED', label: 'Pagamento não aprovado', state: 'warning' },
    ];
  }

  if (isPending) {
    return [
      { key: 'ORDER_CREATED', label: 'Pedido criado', state: 'done' },
      { key: 'PAYMENT_PENDING', label: 'Aguardando pagamento', state: 'current' },
    ];
  }

  return [];
}

const ORDER_STATUS_LABELS = {
  PENDING: 'Aguardando pagamento',
  PAID: 'Pagamento confirmado',
  PAID_STOCK_ISSUE: 'Revisão de estoque',
  PREPARING: 'Em preparação',
  PACKED: 'Embalado',
  LABEL_GENERATED: 'Etiqueta gerada',
  POSTED: 'Postado',
  SHIPPED: 'Em transporte',
  DELIVERED: 'Entregue',
  CANCELED: 'Cancelado',
};

export function OrderConfirmationPage() {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const location = useLocation();
  const { isAuthenticated, isLoadingAuth, token } = useStoreAuth();
  const { clear } = useCart();
  const [order, setOrder] = useState(location.state?.order || null);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [payment, setPayment] = useState(() => getCachedPayment(orderId, location.state?.payment));
  const [paymentQrCode, setPaymentQrCode] = useState('');
  const [copyFeedback, setCopyFeedback] = useState('');
  const [feedback, setFeedback] = useState('');
  const [statusFeedback, setStatusFeedback] = useState('');
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [testPaymentBusy, setTestPaymentBusy] = useState(false);
  const pollStartedAtRef = useRef(Date.now());
  const pollErrorsRef = useRef(0);
  const activeRequestRef = useRef(false);

  const paymentStatus = paymentDetails?.paymentStatus || payment?.status || order?.status || 'PENDING';
  const pixCode = payment?.pixCopyPaste || '';
  const isCardPayment = payment?.paymentMethod === 'card' || Boolean(payment?.clientSecret);
  const gatewayQrImage =
    /^https?:\/\//.test(payment?.qrCode || '') || /^data:image\//.test(payment?.qrCode || '')
      ? payment.qrCode
      : '';
  const isLocalPixPayment = !isCardPayment && payment?.provider === 'local';
  const paymentStatusDetail = String(
    paymentDetails?.paymentStatusDetail || payment?.statusDetail || order?.paymentStatusDetail || '',
  );
  const hasCardPaymentFailure =
    isCardPayment && paymentStatus === 'PENDING' && paymentStatusDetail.includes('payment_failed');
  const isPending = paymentStatus === 'PENDING' || order?.status === 'PENDING';
  const isPaid = ['PAID', 'PREPARING', 'PACKED', 'LABEL_GENERATED', 'POSTED', 'SHIPPED', 'DELIVERED'].includes(
    String(order?.status || paymentStatus),
  );
  const hasStockIssue = String(order?.status || paymentStatus) === 'PAID_STOCK_ISSUE';
  const isExpired = paymentStatus === 'EXPIRED';
  const isCanceled = order?.status === 'CANCELED' || paymentStatus === 'FAILED';
  const canSimulatePixPayment =
    import.meta.env.DEV &&
    !isCardPayment &&
    isPending &&
    !isExpired &&
    !isCanceled &&
    !isPaid &&
    !hasStockIssue;

  const statusMessage = useMemo(() => {
    if (hasStockIssue) {
      return 'Seu pagamento foi confirmado, mas um item precisa de revisão de estoque. Nossa equipe irá verificar seu pedido.';
    }

    if (isPaid) {
      return 'Pagamento confirmado! Seu pedido já está em preparação.';
    }

    if (isExpired) {
      return 'Este pagamento expirou. Refaça o pedido ou fale com atendimento para uma nova tentativa.';
    }

    if (isCanceled) {
      return 'Não foi possível aprovar o pagamento. Verifique os dados ou tente outra forma de pagamento.';
    }

    if (hasCardPaymentFailure) {
      return 'O cartão foi recusado. Confira os dados ou tente outro cartão nesta mesma tela.';
    }

    if (isCardPayment) {
      return 'Aguardando finalização do pagamento com cartão. A confirmação pode levar alguns instantes.';
    }

    return isLocalPixPayment
      ? 'Aguardando pagamento via PIX. Neste ambiente, a baixa do pagamento precisa ser confirmada pela loja.'
      : 'Aguardando pagamento via PIX. A confirmação pode levar alguns instantes.';
  }, [hasCardPaymentFailure, hasStockIssue, isCanceled, isCardPayment, isExpired, isLocalPixPayment, isPaid]);
  const visibleTimeline = useMemo(
    () => buildPaymentTimeline({ isPending, isExpired, isCanceled, isPaid, hasStockIssue }),
    [hasStockIssue, isCanceled, isExpired, isPaid, isPending],
  );

  const loadPayment = useCallback(
    async ({ manual = false } = {}) => {
      if (!orderId || !token || activeRequestRef.current) {
        return;
      }

      activeRequestRef.current = true;
      if (manual) {
        setCheckingStatus(true);
      }

      try {
        const data = await getStoreOrderPayment(token, orderId);
        setPaymentDetails(data);
        setOrder(data.order);
        setPayment((currentPayment) => {
          const nextPayment = mapPaymentFromBackend(data, currentPayment);
          window.sessionStorage.setItem(`payment:${orderId}`, JSON.stringify(nextPayment));
          return nextPayment;
        });
        setFeedback('');
        if (data.paymentStatusDetail === 'payment_intent.payment_failed') {
          setStatusFeedback('O cartão foi recusado. Você pode revisar os dados ou tentar outro cartão.');
        } else {
          setStatusFeedback(manual ? 'Status verificado agora.' : '');
        }
        pollErrorsRef.current = 0;

        if (['PAID', 'PAID_STOCK_ISSUE'].includes(data.paymentStatus) || data.order?.status === 'PAID') {
          clear();
          window.sessionStorage.removeItem(`payment:${orderId}`);
        }
      } catch (requestError) {
        pollErrorsRef.current += 1;
        const message = requestError.message || 'Não foi possível atualizar o status do pedido.';

        if ([403, 404].includes(Number(requestError.status))) {
          setFeedback(message);
        } else if (manual || pollErrorsRef.current >= 3) {
          setStatusFeedback(message);
        }
      } finally {
        activeRequestRef.current = false;
        setCheckingStatus(false);
      }
    },
    [clear, orderId, token],
  );

  useEffect(() => {
    loadPayment();
  }, [loadPayment]);

  useEffect(() => {
    if (gatewayQrImage) {
      setPaymentQrCode(gatewayQrImage);
      return undefined;
    }

    if (!pixCode) {
      setPaymentQrCode('');
      return undefined;
    }

    let active = true;

    async function renderPaymentQrCode() {
      try {
        const qrCode = await createPixQrCode(pixCode);

        if (active) {
          setPaymentQrCode(qrCode);
        }
      } catch {
        if (active) {
          setPaymentQrCode('');
        }
      }
    }

    renderPaymentQrCode();

    return () => {
      active = false;
    };
  }, [gatewayQrImage, pixCode]);

  useEffect(() => {
    if (!orderId || !token || !isPending || isExpired || isCanceled || isPaid || hasStockIssue) {
      return undefined;
    }

    const elapsed = Date.now() - pollStartedAtRef.current;

    if (elapsed > 10 * 60 * 1000 || pollErrorsRef.current >= 5) {
      setStatusFeedback('A verificação automática foi pausada. Use o botão para consultar novamente.');
      return undefined;
    }

    const delay = elapsed < 2 * 60 * 1000 ? 3000 : 10000;
    const timeoutId = window.setTimeout(() => loadPayment(), delay);

    return () => window.clearTimeout(timeoutId);
  }, [hasStockIssue, isCanceled, isExpired, isPaid, isPending, loadPayment, orderId, token, paymentDetails]);

  useEffect(() => {
    if (!isPaid || !order) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      navigate(`/pedido/obrigada/${order.id}`, {
        replace: true,
        state: { order },
      });
    }, 2600);

    return () => window.clearTimeout(timeoutId);
  }, [isPaid, navigate, order]);

  async function handleCopyPix() {
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopyFeedback('Codigo PIX copiado.');
    } catch {
      setCopyFeedback('Não foi possível copiar automaticamente. Selecione o código manualmente.');
    }
  }

  async function handleCompleteTestPayment() {
    if (!orderId || !token) {
      return;
    }

    setTestPaymentBusy(true);
    setFeedback('');

    try {
      await completeTestStoreOrderPayment(token, orderId);
      await loadPayment({ manual: true });
    } catch (requestError) {
      setFeedback(requestError.message || 'Não foi possível concluir o pagamento de teste.');
    } finally {
      setTestPaymentBusy(false);
    }
  }

  function handleCardPaymentError(message) {
    setStatusFeedback(message || 'O cartão foi recusado. Tente novamente ou use outro cartão.');
    window.setTimeout(() => loadPayment({ manual: true }), 1200);
  }

  if (isLoadingAuth) {
    return (
      <div className="page-stack">
        <section className="empty-panel">
          <p className="section-eyebrow">Pedido</p>
          <LoadingSpinner variant="spinner" text="Verificando sua sessão..." />
        </section>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="page-stack">
        <section className="empty-panel">
          <p className="section-eyebrow">Pedido</p>
          <h1>Entre para acompanhar seu pedido.</h1>
          <p>Sua conta protege os dados de pagamento, envio e rastreio.</p>
          <Link to="/entrar" state={{ from: `/checkout/pagamento/${orderId}` }} className="button-primary">
            Entrar
          </Link>
        </section>
      </div>
    );
  }

  if (feedback) {
    return (
      <div className="page-stack">
        <section className="empty-panel">
          <p className="section-eyebrow">Pedido</p>
          <h1>Não conseguimos carregar este pedido.</h1>
          <p>{feedback}</p>
          <Link to="/produtos" className="button-primary">
            Ver produtos
          </Link>
        </section>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="page-stack">
        <section className="empty-panel">
          <p className="section-eyebrow">Pedido</p>
          <LoadingSpinner variant="dual-ring" text="Carregando pagamento..." />
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="content-panel confirmation-panel confirmation-payment-page">
        <div className="confirmation-payment-hero">
          <div>
            <p className="section-eyebrow">Pagamento</p>
            <h1>{isPending && !isExpired ? 'Finalize seu pagamento' : 'Status do pagamento'}</h1>
            <p>{statusMessage}</p>
          </div>

          <div className="confirmation-payment-summary" aria-label="Resumo rapido do pedido">
            <div>
              <span>Pedido</span>
              <strong>#{order.id}</strong>
            </div>
            <div>
              <span>Total</span>
              <strong>{formatCurrency(order.total)}</strong>
            </div>
          </div>
        </div>

        {isPending && !isExpired ? (
          <div className="payment-status-panel payment-focus-panel is-pending">
            <span>Aguardando pagamento</span>
            <strong>{isCardPayment ? 'Pague com cartão' : 'Pague com PIX'}</strong>
            <p>
              {isCardPayment
                ? 'Preencha os dados no ambiente seguro abaixo. Se uma tentativa for recusada, você pode tentar novamente nesta mesma tela.'
                : isLocalPixPayment
                  ? 'Escaneie o QR Code ou use o código cópia e cola. Depois do pagamento, a loja precisa conferir e confirmar o pedido.'
                  : 'Escaneie o QR Code ou use o código copia e cola. A confirmação aparece automaticamente em alguns instantes.'}
            </p>
            {hasCardPaymentFailure ? (
              <div className="payment-status-alert">
                O cartão foi recusado pela Stripe. Nenhuma cobranca foi aprovada; tente outro cartão
                ou confira os dados.
              </div>
            ) : null}
            {isCardPayment ? (
              <StripeCardPayment
                clientSecret={payment?.clientSecret}
                onConfirmed={() => loadPayment({ manual: true })}
                onPaymentError={handleCardPaymentError}
              />
            ) : paymentQrCode || pixCode ? (
              <div className="confirmation-pix-grid">
                {paymentQrCode ? (
                  <div className="pix-qr-frame">
                    <img src={paymentQrCode} alt="QR Code PIX do gateway" />
                  </div>
                ) : null}
                {pixCode ? (
                  <div className="pix-copy-box">
                    <span>PIX Cópia e Cola</span>
                    <textarea readOnly rows={6} value={pixCode} />
                    <button type="button" className="button-secondary button-secondary-dark" onClick={handleCopyPix}>
                      Copiar código PIX
                    </button>
                    {payment?.expiresAt ? (
                      <small>Expira em {formatPaymentExpiration(payment.expiresAt)}.</small>
                    ) : null}
                    {payment?.ticketUrl || payment?.hostedInstructionsUrl ? (
                      <a
                        href={payment.ticketUrl || payment.hostedInstructionsUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Abrir instruções de pagamento
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <p>
                Não foi possível carregar o código PIX deste pedido. Use o botão para verificar o
                status ou fale com atendimento.
              </p>
            )}
            <div className="confirmation-payment-actions">
              <button
                type="button"
                className="button-secondary button-secondary-dark"
                disabled={checkingStatus}
                onClick={() => loadPayment({ manual: true })}
              >
                {checkingStatus ? 'Verificando...' : 'Já paguei, verificar status'}
              </button>
              {canSimulatePixPayment ? (
                <button
                  type="button"
                  className="button-primary confirmation-test-button"
                  disabled={testPaymentBusy}
                  onClick={handleCompleteTestPayment}
                >
                  {testPaymentBusy ? 'Simulando pagamento...' : 'Simular pagamento via PIX'}
                </button>
              ) : null}
            </div>
            {copyFeedback ? <div className="feedback-success">{copyFeedback}</div> : null}
            {statusFeedback ? <div className="checkout-inline-feedback">{statusFeedback}</div> : null}
          </div>
        ) : null}

        {isPaid ? (
          <div className="payment-result-card is-paid">
            <div className="payment-check-animation" aria-hidden="true">
              <span />
            </div>
            <div>
              <span>Pagamento aprovado</span>
              <strong>Pedido em preparação</strong>
              <p>Recebemos seu pagamento. Você será redirecionado em instantes.</p>
            </div>
          </div>
        ) : null}

        {hasStockIssue ? (
          <div className="payment-status-panel is-canceled">
            <span>Revisão de estoque</span>
            <strong>Equipe acionada</strong>
            <p>Seu pagamento foi confirmado, mas um item precisa de revisao de estoque.</p>
          </div>
        ) : null}

        {isExpired ? (
          <div className="payment-status-panel is-canceled">
            <span>Pagamento expirado</span>
            <strong>Este pagamento expirou</strong>
            <p>Refaça o pedido ou fale com atendimento para gerar uma nova tentativa.</p>
          </div>
        ) : null}

        {isCanceled ? (
          <div className="payment-status-panel is-canceled">
            <span>Pagamento não aprovado</span>
            <strong>O pedido não foi pago</strong>
            <p>Voce pode refazer o checkout ou falar com atendimento.</p>
          </div>
        ) : null}

        <details className="confirmation-order-details">
          <summary>Resumo do pedido</summary>

          {visibleTimeline.length ? <OrderTimeline steps={visibleTimeline} /> : null}

          <div className="confirmation-meta">
            <div>
              <span>Status</span>
              <strong>{ORDER_STATUS_LABELS[order.status] || order.status || 'Aguardando pagamento'}</strong>
            </div>
            <div>
              <span>Total</span>
              <strong>{formatCurrency(order.total)}</strong>
            </div>
            <div>
              <span>Cliente</span>
              <strong>{order.customer?.name}</strong>
            </div>
          </div>

          <div className="checkout-items confirmation-items">
            {order.items?.map((item) => (
              <div key={item.id} className="checkout-item">
                <span>
                  {item.product?.name || `Produto #${item.productId}`}
                  {item.variant?.name ? ` - ${item.variant.name}` : ''}
                </span>
                <strong>
                  {item.quantity} x {formatCurrency(item.price)}
                </strong>
              </div>
            ))}
          </div>
        </details>

        <div className="confirmation-actions">
          <Link to="/produtos" className="button-primary">
            Continuar comprando
          </Link>
          <Link to="/sobre" className="button-secondary button-secondary-dark">
            Falar com atendimento
          </Link>
        </div>
      </section>
    </div>
  );
}
