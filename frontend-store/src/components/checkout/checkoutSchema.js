import { z } from 'zod';

const onlyDigits = (value) => String(value || '').replace(/\D/g, '');

function isValidCpf(value) {
  const cpf = onlyDigits(value);

  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  let sum = 0;
  for (let index = 0; index < 9; index += 1) {
    sum += Number(cpf[index]) * (10 - index);
  }
  let digit = (sum * 10) % 11;
  if (digit === 10) {
    digit = 0;
  }
  if (digit !== Number(cpf[9])) {
    return false;
  }

  sum = 0;
  for (let index = 0; index < 10; index += 1) {
    sum += Number(cpf[index]) * (11 - index);
  }
  digit = (sum * 10) % 11;
  if (digit === 10) {
    digit = 0;
  }

  return digit === Number(cpf[10]);
}

export const checkoutSchema = z.object({
  email: z.string().email('Informe um e-mail válido.'),
  name: z.string().min(3, 'Informe o nome completo.'),
  cpf: z.string().refine(isValidCpf, 'Informe um CPF válido.'),
  phone: z.string().min(8, 'Informe um telefone para contato.'),
  notifyWhatsApp: z.boolean().default(false),
  preferredContact: z.enum(['email', 'whatsapp']).default('email'),
  zipCode: z.string().refine((value) => onlyDigits(value).length === 8, 'Informe um CEP válido.'),
  street: z.string().min(3, 'Informe o logradouro.'),
  number: z.string().min(1, 'Informe o número.'),
  complement: z.string().optional(),
  neighborhood: z.string().min(2, 'Informe o bairro.'),
  city: z.string().min(2, 'Informe a cidade.'),
  state: z.string().length(2, 'Informe a UF.'),
  giftWrap: z.boolean().default(false),
  orderNotes: z.string().optional(),
  paymentMethod: z.enum(['pix', 'card']),
});

export function normalizeCheckoutPayload(values) {
  const notes = [values.giftWrap ? 'Embalar para presente.' : '', values.orderNotes || '']
    .filter(Boolean)
    .join('\n');

  return {
    customer: {
      email: values.email,
      name: values.name,
      cpf: onlyDigits(values.cpf),
      phone: onlyDigits(values.phone),
      notifyWhatsApp: values.notifyWhatsApp || false,
      // Hoje a loja nao envia notificacoes automaticas por WhatsApp; mantemos o dado
      // apenas como preferencia operacional e base para uma integracao futura.
      preferredContact: values.preferredContact || 'email',
    },
    shippingAddress: {
      zipCode: onlyDigits(values.zipCode),
      street: values.street,
      number: values.number,
      complement: values.complement || '',
      neighborhood: values.neighborhood,
      city: values.city,
      state: values.state.toUpperCase(),
    },
    orderNotes: notes,
    paymentMethod: values.paymentMethod,
  };
}

export { onlyDigits };
