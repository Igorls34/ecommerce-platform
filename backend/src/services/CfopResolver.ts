const DEFAULT_CFOP_IN_STATE = '5102';
const DEFAULT_CFOP_OUT_STATE = '6102';
const COMPANY_STATE_UPPER = 'RJ';

export function resolveCfop(customerState?: string | null): string {
  const uf = String(customerState || '').trim().toUpperCase();

  if (!uf) {
    return DEFAULT_CFOP_IN_STATE;
  }

  return uf === COMPANY_STATE_UPPER ? DEFAULT_CFOP_IN_STATE : DEFAULT_CFOP_OUT_STATE;
}
