import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';

import { LoadingSpinner } from '../components/LoadingSpinner';
import { CheckoutForm } from '../components/checkout/CheckoutForm';
import {
  checkoutSchema,
  normalizeCheckoutPayload,
  onlyDigits,
} from '../components/checkout/checkoutSchema';
import { MercadoPagoCardPayment } from '../components/checkout/MercadoPagoCardPayment';
import { calculateCheckoutTotals, OrderSummary } from '../components/checkout/OrderSummary';
import {
  calculateStoreShipping,
  createStoreOrder,
  getStoreCustomerProfile,
  getStoreProductById,
} from '../services/api';
import { brandAssets } from '../lib/brandAssets';
import { useCart } from '../state/CartContext';
import { useStoreAuth } from '../state/StoreAuthContext';

const CHECKOUT_STEPS = [
  {
    label: 'Dados',
    title: 'Seus dados',
    description: 'Confirme seus dados para atendimento, pagamento e acompanhamento do pedido.',
    nextLabel: 'Continuar para endereço',
    fields: ['email', 'name', 'cpf', 'phone', 'notifyWhatsApp', 'preferredContact'],
  },
  {
    label: 'Endereço',
    title: 'Endereço de entrega',
    description: 'Informe o destino para calcular a entrega.',
    nextLabel: 'Continuar para observações',
    fields: ['zipCode', 'street', 'number', 'complement', 'neighborhood', 'city', 'state'],
  },
  {
    label: 'Observações',
    title: 'Observações do pedido',
    description: 'Adicione algum cuidado de embalagem ou entrega, sem alterar o endereço oficial.',
    nextLabel: 'Continuar para pagamento',
    fields: ['giftWrap', 'orderNotes'],
  },
  {
    label: 'Pagamento',
    title: 'Revise e pague',
    description: 'Escolha a forma de pagamento e finalize.',
    nextLabel: 'Gerar pedido e pagar',
    fields: ['paymentMethod'],
  },
];

const PAYMENT_LABELS = {
  pix: 'PIX',
  card: 'Cartão de crédito à vista',
};

function createCheckoutAttemptId() {
  return window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function CheckoutFinalReview({ paymentMethod, values }) {
  return (
    <section className="checkout-final-review" aria-label="Revisão do pedido">
      <div>
        <span>Pagamento</span>
        <strong>{PAYMENT_LABELS[paymentMethod] || paymentMethod}</strong>
        <p>
          {paymentMethod === 'pix'
            ? 'O desconto PIX já aparece no resumo.'
            : 'Os dados do cartão serão informados na próxima tela segura. A cobrança será à vista.'}
        </p>
      </div>
      {values.orderNotes ? (
        <div>
          <span>Observações</span>
          <strong>Mensagem adicionada</strong>
          <p>{values.orderNotes}</p>
        </div>
      ) : null}
      {values.giftWrap ? (
        <div>
          <span>Presente</span>
          <strong>Embalar para presente</strong>
          <p>Vamos separar o pedido com cuidado especial para presente.</p>
        </div>
      ) : null}
    </section>
  );
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const { items, removeItem, updateQuantity } = useCart();
  const { customer, isAuthenticated, isLoadingAuth, token } = useStoreAuth();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [cepFeedback, setCepFeedback] = useState('');
  const [shippingOptions, setShippingOptions] = useState([]);
  const [selectedShipping, setSelectedShipping] = useState(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [savedAddress, setSavedAddress] = useState(null);
  const [editingAddress, setEditingAddress] = useState(true);
  const checkoutAttemptIdRef = useRef(createCheckoutAttemptId());
  const previousPaymentMethodRef = useRef(null);
  const mpCardRef = useRef(null);
  const cardTokenRef = useRef(null);
  const cardNetworkRef = useRef(null);
  const {
    formState: { errors },
    handleSubmit,
    register,
    setValue,
    trigger,
    watch,
  } = useForm({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      email: customer?.email || '',
      name: customer?.name || '',
      cpf: '',
      phone: customer?.phone || '',
      notifyWhatsApp: false,
      // Hoje o projeto apenas coleta telefone/preferencia. Nao ha envio automatico
      // ou notificacoes via WhatsApp; se isso for viavel depois, integrar provedor dedicado.
      preferredContact: 'email',
      zipCode: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      giftWrap: false,
      orderNotes: '',
      paymentMethod: 'pix',
      cardNumber: '',
      cardName: '',
      cardExpiry: '',
      cardCvv: '',
      // Futuro: quando houver gateway com parcelamento real, adicionar aqui um campo
      // installments e enviar a opcao escolhida no payload do pedido/pagamento.
    },
  });

  const checkoutItems = useMemo(
    () =>
      items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: item.quantity,
      })),
    [items],
  );
  const packageInsuranceValue = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0),
    [items],
  );
  const paymentMethod = watch('paymentMethod');
  const checkoutValues = watch();
  const isLastStep = currentStep === CHECKOUT_STEPS.length - 1;
  const checkoutTotal = useMemo(
    () => calculateCheckoutTotals(items, paymentMethod, selectedShipping).total,
    [items, paymentMethod, selectedShipping],
  );
  const currentStepConfig = CHECKOUT_STEPS[currentStep];
  const primaryActionLabel = isLastStep
    ? paymentMethod === 'pix'
      ? 'Gerar pedido e pagar'
      : 'Pagar com cartão à vista'
    : currentStepConfig.nextLabel;

  useEffect(() => {
    if (!previousPaymentMethodRef.current) {
      previousPaymentMethodRef.current = paymentMethod;
      return;
    }

    if (previousPaymentMethodRef.current !== paymentMethod) {
      previousPaymentMethodRef.current = paymentMethod;
      checkoutAttemptIdRef.current = createCheckoutAttemptId();
    }
  }, [paymentMethod]);

  useEffect(() => {
    let active = true;

    async function loadSavedAddress() {
      if (!token) {
        return;
      }

      try {
        const profile = await getStoreCustomerProfile(token, { skipAuthExpired: true });
        const address = profile?.defaultAddress;

        if (!active || !address?.zipCode) {
          return;
        }

        setSavedAddress(address);
        setEditingAddress(false);
        applyAddressToForm(address);
        await calculateDeliveryOptions(address.zipCode);
      } catch {
        // O checkout continua funcionando mesmo sem endereco salvo.
      }
    }

    loadSavedAddress();

    return () => {
      active = false;
    };
  }, [token]);

  function applyAddressToForm(address) {
    setValue('zipCode', address.zipCode || '', { shouldValidate: true });
    setValue('street', address.street || '', { shouldValidate: true });
    setValue('number', address.number || '', { shouldValidate: true });
    setValue('complement', address.complement || '', { shouldValidate: true });
    setValue('neighborhood', address.neighborhood || '', { shouldValidate: true });
    setValue('city', address.city || '', { shouldValidate: true });
    setValue('state', address.state || '', { shouldValidate: true });
  }

  async function useSavedAddress() {
    if (!savedAddress) {
      return;
    }

    setFeedback('');
    setEditingAddress(false);
    applyAddressToForm(savedAddress);
    await calculateDeliveryOptions(savedAddress.zipCode);
  }

  async function calculateDeliveryOptions(zipCode) {
    const cleanZipCode = onlyDigits(zipCode);

    if (cleanZipCode.length !== 8) {
      setShippingOptions([]);
      setSelectedShipping(null);
      setShippingError('Informe um CEP válido para ver as opções de entrega.');
      return;
    }

    setShippingLoading(true);
    setShippingError('');
    setShippingOptions([]);
    setSelectedShipping(null);

    try {
      const response = await calculateStoreShipping({
        zipCode: cleanZipCode,
        insuranceValue: packageInsuranceValue,
      });
      const options = Array.isArray(response.data) ? response.data : [];

      setShippingOptions(options);

      if (options.length) {
        const cheapest = options.reduce((previous, current) =>
          Number(previous.price) <= Number(current.price) ? previous : current,
        );
        setSelectedShipping(cheapest);
      } else {
        setShippingError('Nenhuma opção de entrega disponível para este CEP.');
      }
    } catch (requestError) {
      setShippingError(requestError.message || 'Não foi possível calcular o frete.');
    } finally {
      setShippingLoading(false);
    }
  }

  async function handleCepBlur(event) {
    const zipCode = onlyDigits(event.target.value);

    if (zipCode.length !== 8) {
      return;
    }

    setCepFeedback('Buscando endereço pelo CEP...');

    try {
      // ViaCEP melhora UX preenchendo endereco, mas falha da API nao bloqueia checkout.
      const response = await fetch(`https://viacep.com.br/ws/${zipCode}/json/`);
      const address = await response.json();

      if (address.erro) {
        setCepFeedback('CEP não encontrado. Preencha o endereço manualmente.');
        return;
      }

      setValue('street', address.logradouro || '', { shouldValidate: true });
      setValue('neighborhood', address.bairro || '', { shouldValidate: true });
      setValue('city', address.localidade || '', { shouldValidate: true });
      setValue('state', address.uf || '', { shouldValidate: true });
      setCepFeedback('Endereço preenchido pelo CEP.');
    } catch {
      setCepFeedback('Não foi possível buscar o CEP agora. Preencha manualmente.');
    } finally {
      await calculateDeliveryOptions(zipCode);
    }
  }

  async function submitCheckout(values) {
    setBusy(true);
    setFeedback('');

    try {
      const cartIsValid = await validateCartBeforeCheckout();

      if (!cartIsValid) {
        return;
      }

      if (!selectedShipping) {
        setFeedback('Informe o CEP e aguarde o cálculo da entrega antes de finalizar.');
        return;
      }

      if (values.paymentMethod === 'card') {
        if (!mpCardRef.current) {
          setFeedback('Formulario de cartao nao esta pronto. Aguarde o carregamento.');
          return;
        }

        try {
          const { token: cardToken, networkId } = await mpCardRef.current.generateCardToken();
          cardTokenRef.current = cardToken;
          cardNetworkRef.current = networkId || '';
        } catch (cardError) {
          setFeedback(cardError.message || 'Erro ao processar o cartao.');
          return;
        }
      }

      const response = await createStoreOrder(token, {
        items: checkoutItems,
        checkoutAttemptId: checkoutAttemptIdRef.current,
        ...normalizeCheckoutPayload(values),
        selectedShipping,
        ...(values.paymentMethod === 'card' && cardTokenRef.current
          ? { cardToken: cardTokenRef.current, cardNetworkId: cardNetworkRef.current || undefined }
          : {}),
      });
      // Como o schema atual nao persiste dados do gateway, guardamos temporariamente
      // a resposta de pagamento para a pagina de confirmacao renderizar o QR Code.
      window.sessionStorage.setItem(
        `payment:${response.order.id}`,
        JSON.stringify(response.payment),
      );

      navigate(`/checkout/pagamento/${response.order.id}`, {
        replace: true,
        state: {
          order: response.order,
          payment: response.payment,
        },
      });
    } catch (requestError) {
      if (requestError.status === 409 && requestError.code === 'SHIPPING_PRICE_CHANGED') {
        const nextOptions = Array.isArray(requestError.shippingOptions)
          ? requestError.shippingOptions
          : [];
        const cheapestOption = nextOptions.length
          ? nextOptions.reduce((previous, current) =>
              Number(previous.price) <= Number(current.price) ? previous : current,
            )
          : null;
        setShippingOptions(nextOptions);
        setSelectedShipping(cheapestOption);
        setShippingError('');
        setFeedback('O valor da entrega foi atualizado. Confira o resumo antes de finalizar.');
        return;
      }

      setFeedback(requestError.message || 'Não foi possível finalizar o pedido.');
    } finally {
      setBusy(false);
    }
  }

  async function validateCartBeforeCheckout() {
    const products = await Promise.all(
      items.map((item) =>
        getStoreProductById(item.productId)
          .then((product) => ({ item, product }))
          .catch(() => ({ item, product: null })),
      ),
    );

    const messages = [];
    let changedCart = false;

    for (const { item, product } of products) {
      if (!product) {
        removeItem(item.productId, item.variantId);
        messages.push(`${item.name} não está mais disponível e foi removido do carrinho.`);
        changedCart = true;
        continue;
      }

      const variant = item.variantId
        ? (product.variants || []).find(
            (currentVariant) =>
              Number(currentVariant.id) === Number(item.variantId) &&
              currentVariant.active !== false,
          )
        : null;
      const stock = Number((variant || product).stock || 0);
      const itemLabel = item.variantName ? `${item.name} - ${item.variantName}` : item.name;

      if (stock <= 0) {
        removeItem(item.productId, item.variantId);
        messages.push(`${itemLabel} saiu de estoque e foi removido do carrinho.`);
        changedCart = true;
        continue;
      }

      if (item.quantity > stock || item.stock !== stock) {
        const result = updateQuantity(
          item.productId,
          Math.min(item.quantity, stock),
          stock,
          item.variantId,
        );
        changedCart = true;

        if (item.quantity > stock) {
          messages.push(
            `${itemLabel} foi ajustado para ${result.quantity} unidade(s), conforme estoque.`,
          );
        }
      }
    }

    if (changedCart) {
      setFeedback(
        messages.length
          ? `${messages.join(' ')} Revise o carrinho antes de finalizar.`
          : 'O carrinho foi atualizado. Revise os itens antes de finalizar.',
      );
      return false;
    }

    return true;
  }

  const submitForm = handleSubmit(submitCheckout);

  async function goToNextStep() {
    setFeedback('');
    const isStepValid = await trigger(currentStepConfig.fields, { shouldFocus: true });

    if (!isStepValid) {
      setFeedback('Preencha os campos obrigatórios desta etapa antes de continuar.');
      return;
    }

    if (currentStep === 1) {
      if (shippingLoading) {
        setFeedback('Aguarde o cálculo do frete antes de continuar.');
        return;
      }

      if (!selectedShipping) {
        setFeedback('Informe o CEP e aguarde o cálculo da entrega antes de continuar.');
        return;
      }
    }

    setCurrentStep((step) => Math.min(step + 1, CHECKOUT_STEPS.length - 1));
  }

  function goToPreviousStep() {
    setFeedback('');
    setCurrentStep((step) => Math.max(step - 1, 0));
  }

  function handleCheckoutPrimaryAction() {
    if (isLastStep) {
      submitForm();
      return;
    }

    goToNextStep();
  }

  if (!items.length) {
    return (
      <div className="page-stack">
        <section className="empty-panel">
          <p className="section-eyebrow">Checkout</p>
          <h1>Nenhum item para finalizar.</h1>
          <p>Escolha as peças antes de criar um pedido.</p>
          <Link to="/produtos" className="button-primary">
            Ver produtos
          </Link>
        </section>
      </div>
    );
  }

  if (isLoadingAuth) {
    return (
      <div className="page-stack">
        <section className="empty-panel">
          <p className="section-eyebrow">Checkout</p>
          <LoadingSpinner variant="dual-ring" text="Verificando sua sessão..." />
        </section>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="page-stack">
        <section className="checkout-auth-gate">
          <div className="checkout-auth-copy">
            <img src={brandAssets.logoHorizontalBlue} alt="Thessara" decoding="async" />
            <p className="section-eyebrow">Checkout seguro</p>
            <h1>Entre na sua conta para finalizar a compra</h1>
            <p>
              Sua conta guarda os dados do pedido, pagamento, endereço de entrega e atualizações de
              rastreio em um único lugar.
            </p>

            <div className="checkout-auth-actions">
              <Link to="/entrar" state={{ from: '/checkout' }} className="button-primary">
                Entrar ou criar conta
              </Link>
              <Link to="/carrinho" className="button-secondary button-secondary-dark">
                Voltar ao carrinho
              </Link>
            </div>
          </div>

          <div className="checkout-auth-panel" aria-label="O que sua conta protege">
            <div>
              <span>01</span>
              <strong>Pagamento acompanhado</strong>
              <p>Veja o status do pedido e qualquer pendência antes do envio.</p>
            </div>
            <div>
              <span>02</span>
              <strong>Entrega organizada</strong>
              <p>Endereço, observações e código de rastreio ficam salvos na conta.</p>
            </div>
            <div>
              <span>03</span>
              <strong>Histórico protegido</strong>
              <p>Depois da compra, você acompanha tudo pela página Minha conta.</p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack checkout">
      <form
        className="checkout-layout checkout__layout"
        onSubmit={(event) => {
          event.preventDefault();
          handleCheckoutPrimaryAction();
        }}
      >
        <div className="content-panel checkout-panel checkout__panel">
          <p className="section-eyebrow">Checkout</p>
          <h1>{currentStepConfig.title}</h1>
          <p>{currentStepConfig.description}</p>

          <div className="checkout-path checkout__path" aria-label="Etapas do checkout">
            {CHECKOUT_STEPS.map((step, index) => (
              <span
                key={step.label}
                className={[
                  index === currentStep ? 'is-current' : '',
                  index < currentStep ? 'is-done' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {index + 1}. {step.label}
              </span>
            ))}
          </div>

          <CheckoutForm
            cepFeedback={cepFeedback}
            currentStep={currentStep}
            editingAddress={editingAddress}
            errors={errors}
            onCepBlur={handleCepBlur}
            onEditSavedAddress={() => setEditingAddress(true)}
            onUseSavedAddress={useSavedAddress}
            register={register}
            savedAddress={savedAddress}
            selectedShipping={selectedShipping}
            setValue={setValue}
            shippingError={shippingError}
            shippingLoading={shippingLoading}
            shippingOptions={shippingOptions}
            watch={watch}
          />

          {currentStep === 3 && paymentMethod === 'card' && (
            <MercadoPagoCardPayment
              ref={mpCardRef}
              total={checkoutTotal}
              onError={(err) => setFeedback(err)}
            />
          )}

          {isLastStep ? (
            <CheckoutFinalReview
              paymentMethod={paymentMethod}
              values={checkoutValues}
            />
          ) : null}

          {feedback ? <div className="feedback-error">{feedback}</div> : null}
          <div className="checkout-step-actions">
            {currentStep > 0 ? (
              <button
                type="button"
                className="button-secondary button-secondary-dark"
                onClick={goToPreviousStep}
              >
                Voltar
              </button>
            ) : (
              <Link
                to="/carrinho"
                className="button-secondary button-secondary-dark checkout-back-link"
              >
                Voltar ao carrinho
              </Link>
            )}
            <button
              type="button"
              className="button-primary"
              disabled={busy || shippingLoading}
              onClick={handleCheckoutPrimaryAction}
            >
              {busy ? 'Gerando pedido...' : primaryActionLabel}
            </button>
          </div>
        </div>

        <OrderSummary
          busy={busy}
          items={items}
          onSubmit={handleCheckoutPrimaryAction}
          paymentMethod={paymentMethod}
          selectedShipping={selectedShipping}
          summaryOpen={summaryOpen}
          submitLabel={primaryActionLabel}
          onToggleSummary={() => setSummaryOpen((isOpen) => !isOpen)}
        />
      </form>
    </div>
  );
}
