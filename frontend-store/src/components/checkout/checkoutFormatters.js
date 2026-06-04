export function maskCpf(value) {
  return String(value || '')
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function maskZipCode(value) {
  return String(value || '')
    .replace(/\D/g, '')
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, '$1-$2');
}

export function maskPhone(value) {
  const digits = String(value || '')
    .replace(/\D/g, '')
    .slice(0, 11);

  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
  }

  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
}

export function maskCardNumber(value) {
  return String(value || '')
    .replace(/\D/g, '')
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, '$1 ');
}

export function maskCardExpiry(value) {
  return String(value || '')
    .replace(/\D/g, '')
    .slice(0, 4)
    .replace(/(\d{2})(\d)/, '$1/$2');
}

export function detectCardBrand(value) {
  const digits = String(value || '').replace(/\D/g, '');

  if (/^4/.test(digits)) {
    return 'Visa';
  }

  if (/^(5[1-5]|2[2-7])/.test(digits)) {
    return 'Mastercard';
  }

  if (/^3[47]/.test(digits)) {
    return 'Amex';
  }

  if (/^(4011|4312|4389|4514|4576|5041|5066|5067|509|6277|6362|6363)/.test(digits)) {
    return 'Elo';
  }

  return digits.length >= 6 ? 'Cartao' : '';
}
