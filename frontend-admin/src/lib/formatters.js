export function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function formatPercent(value, digits = 1) {
  return `${Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

export function pluralize(count, singular, plural = `${singular}s`) {
  const value = Number(count || 0);
  return `${value.toLocaleString('pt-BR')} ${value === 1 ? singular : plural}`;
}

export function safePercentage(part, total) {
  const normalizedTotal = Number(total || 0);

  if (!normalizedTotal) {
    return 0;
  }

  return (Number(part || 0) / normalizedTotal) * 100;
}

export function formatDateBR(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export function classifyStock(quantity) {
  const stock = Number(quantity || 0);

  if (stock <= 0) {
    return 'Sem estoque';
  }

  if (stock <= 3) {
    return 'Crítico';
  }

  if (stock <= 10) {
    return 'Atenção';
  }

  return 'Saudável';
}
