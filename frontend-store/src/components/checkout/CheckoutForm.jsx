import { CheckoutField } from './CheckoutField';
import { maskCpf, maskPhone, maskZipCode } from './checkoutFormatters';
import { PaymentMethods } from './PaymentMethods';

import { formatCurrency } from '../../lib/formatters';

export function CheckoutForm({
  cepFeedback,
  currentStep = 0,
  editingAddress = true,
  errors,
  onCepBlur,
  onEditSavedAddress,
  onUseSavedAddress,
  register,
  savedAddress,
  selectedShipping,
  setValue,
  shippingError,
  shippingLoading,
  shippingOptions,
  watch,
}) {
  return (
    <div className="checkout-form-stack">
      <section className={`checkout-section${currentStep === 0 ? '' : ' is-hidden'}`}>
        <div className="checkout-section-heading">
          <span>1</span>
          <div>
            <h2>Identificação</h2>
            <p>Pedido vinculado a sua conta para acompanhamento e suporte.</p>
          </div>
        </div>

        <CheckoutField
          label="E-mail"
          error={errors.email}
          registration={register('email')}
          type="email"
          autoComplete="email"
          placeholder="você@email.com"
        />

        <div className="checkout-field-grid">
          <CheckoutField
            label="Nome completo"
            error={errors.name}
            registration={register('name')}
            autoComplete="name"
            placeholder="Nome e sobrenome"
          />
          <CheckoutField
            label="CPF"
            error={errors.cpf}
            registration={register('cpf')}
            inputMode="numeric"
            placeholder="000.000.000-00"
            onChange={(event) =>
              setValue('cpf', maskCpf(event.target.value), { shouldValidate: true })
            }
          />
        </div>

        <CheckoutField
          label="Telefone"
          error={errors.phone}
          registration={register('phone')}
          inputMode="numeric"
          autoComplete="tel"
          placeholder="(00) 00000-0000"
          onChange={(event) =>
            setValue('phone', maskPhone(event.target.value), { shouldValidate: true })
          }
        />

        <div className="checkout-field">
          <label className="checkbox-field">
            <input type="checkbox" {...register('notifyWhatsApp')} />
            <span>Permitir contato por WhatsApp, se necessario</span>
          </label>
          <small>
            No momento, as atualizações automáticas do pedido são enviadas por e-mail.
          </small>
        </div>

        <div className="checkout-field">
          <span>Preferência de contato</span>
          <div className="radio-group">
            <label className="radio-field">
              <input type="radio" {...register('preferredContact')} value="email" />
              <span>E-mail</span>
            </label>
            <label className="radio-field">
              <input type="radio" {...register('preferredContact')} value="whatsapp" />
              <span>WhatsApp</span>
            </label>
          </div>
        </div>

      </section>

      <section className={`checkout-section${currentStep === 1 ? '' : ' is-hidden'}`}>
        <div className="checkout-section-heading">
          <span>2</span>
          <div>
            <h2>Endereço</h2>
            <p>O CEP preenche rua, bairro, cidade e UF automaticamente.</p>
          </div>
        </div>

        {savedAddress && !editingAddress ? (
          <div className="checkout-saved-address">
            <div>
              <span>Endereço principal</span>
              <strong>
                {savedAddress.street}, {savedAddress.number}
              </strong>
              <p>
                {[savedAddress.neighborhood, savedAddress.city, savedAddress.state]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            </div>
            <button type="button" className="button-secondary" onClick={onEditSavedAddress}>
              Editar
            </button>
          </div>
        ) : (
          <>
            {savedAddress ? (
              <button type="button" className="button-secondary" onClick={onUseSavedAddress}>
                Usar endereço salvo
              </button>
            ) : null}

            <div className="checkout-field-grid">
              <CheckoutField
                label="CEP"
                error={errors.zipCode}
                registration={register('zipCode')}
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder="00000-000"
                onBlur={onCepBlur}
                onChange={(event) =>
                  setValue('zipCode', maskZipCode(event.target.value), { shouldValidate: true })
                }
              />
              <CheckoutField
                label="Numero"
                error={errors.number}
                registration={register('number')}
                inputMode="numeric"
                autoComplete="address-line2"
                placeholder="123"
              />
            </div>

            {cepFeedback ? <div className="checkout-inline-feedback">{cepFeedback}</div> : null}

            <CheckoutField
              label="Logradouro"
              error={errors.street}
              registration={register('street')}
              autoComplete="address-line1"
              placeholder="Rua, avenida ou travessa"
            />

            <div className="checkout-field-grid">
              <CheckoutField
                label="Bairro"
                error={errors.neighborhood}
                registration={register('neighborhood')}
                placeholder="Bairro"
              />
              <CheckoutField
                label="Complemento"
                error={errors.complement}
                registration={register('complement')}
                placeholder="Apto, bloco, referencia"
              />
            </div>

            <div className="checkout-field-grid">
              <CheckoutField
                label="Cidade"
                error={errors.city}
                registration={register('city')}
                placeholder="Cidade"
              />
              <CheckoutField
                label="UF"
                error={errors.state}
                registration={register('state')}
                maxLength={2}
                placeholder="SP"
                onChange={(event) =>
                  setValue('state', event.target.value.toUpperCase(), { shouldValidate: true })
                }
              />
            </div>
          </>
        )}

        <div className="checkout-shipping-options">
          <span>Entrega</span>
          {shippingLoading ? (
            <div className="checkout-inline-feedback">Calculando frete...</div>
          ) : null}
          {shippingError ? <div className="checkout-inline-feedback">{shippingError}</div> : null}
          {!shippingLoading && !shippingOptions.length ? (
            <div className="checkout-inline-feedback">
              Informe o CEP para calcular a entrega automaticamente.
            </div>
          ) : null}
          {selectedShipping ? (
            <div className="shipping-auto-card">
              <div>
                <strong>Entrega calculada</strong>
                <small>
                  {selectedShipping.deadline
                    ? `Receba em até ${selectedShipping.deadline} dia(s)`
                    : 'Prazo calculado no fechamento'}
                </small>
              </div>
              <b>{formatCurrency(selectedShipping.price)}</b>
            </div>
          ) : null}
        </div>
      </section>

      <section className={`checkout-section${currentStep === 2 ? '' : ' is-hidden'}`}>
        <div className="checkout-section-heading">
          <span>3</span>
          <div>
            <h2>Observações</h2>
            <p>Observações sobre o pedido, embalagem ou entrega.</p>
          </div>
        </div>

        <div className="checkout-gift-option">
          <label className="checkbox-field">
            <input type="checkbox" {...register('giftWrap')} />
            <span>Embalar para presente</span>
          </label>
          <p>Marque esta opção se quiser que a equipe prepare o pedido com cuidado de presente.</p>
        </div>

        <div className="checkout-field">
          <label htmlFor="orderNotes">Observações do pedido</label>
          <textarea
            id="orderNotes"
            {...register('orderNotes')}
            placeholder="Não use este campo para alterar o endereço."
            rows="4"
            maxLength="500"
            style={{ width: '100%', fontFamily: 'inherit', fontSize: '1rem' }}
          />
          <small>Máximo 500 caracteres</small>
        </div>
      </section>

      <section className={`checkout-section${currentStep === 3 ? '' : ' is-hidden'}`}>
        <div className="checkout-section-heading">
          <span>4</span>
          <div>
            <h2>Pagamento</h2>
            <p>Escolha a forma que prefere para pagar.</p>
          </div>
        </div>

        <PaymentMethods
          paymentRegistration={register('paymentMethod')}
          setValue={setValue}
          watch={watch}
        />
      </section>
    </div>
  );
}
