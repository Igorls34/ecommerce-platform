function normalizeCategoryName(name) {
  return String(name || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function toEditorialCategoryLabel(name) {
  const n = normalizeCategoryName(name);
  if (!n) return 'CATEGORIA';
  return n.replace(/\s+/g, ' ').toUpperCase();
}
