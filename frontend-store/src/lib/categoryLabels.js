const CATEGORY_LABEL_MAP = {
  aneis: 'ANEIS',
  anel: 'ANEL',
  brincos: 'BRINCOS',
  brinco: 'BRINCO',
  colares: 'COLARES',
  colar: 'COLAR',
  pulseiras: 'PULSEIRAS',
  pulseira: 'PULSEIRA',
  braceletes: 'BRACELETES',
  bracelete: 'BRACELETE',
  earcuff: 'EAR CUFF',
  'ear cuff': 'EAR CUFF',
  bijuteriasreligiosas: 'BIJUTERIAS\nRELIGIOSAS',
  'bijuterias religiosas': 'BIJUTERIAS\nRELIGIOSAS',
  earrings: 'EARRINGS',
  bracelet: 'BRACELET',
  necklace: 'NECKLACE',
  necklaces: 'NECKLACES',
};

function normalizeCategoryName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function toEditorialCategoryLabel(name) {
  const normalizedName = normalizeCategoryName(name);

  if (!normalizedName) {
    return 'COLECAO';
  }

  if (CATEGORY_LABEL_MAP[normalizedName]) {
    return CATEGORY_LABEL_MAP[normalizedName];
  }

  const cleanName = normalizedName.replace(/\s+/g, '');

  if (cleanName.length <= 4) {
    return cleanName.toUpperCase();
  }

  return normalizedName.split(/\s+/).filter(Boolean).join('\n').toUpperCase();
}
