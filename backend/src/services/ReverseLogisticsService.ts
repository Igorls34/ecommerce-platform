export type ReverseLogisticsIntegrationStatus = {
  enabled: boolean;
  provider: string;
  configured: boolean;
  message: string;
};

function getProvider() {
  return String(process.env.REVERSE_LOGISTICS_PROVIDER || 'disabled').trim().toLowerCase();
}

export class ReverseLogisticsService {
  getStatus(): ReverseLogisticsIntegrationStatus {
    const provider = getProvider();
    const enabled = provider !== 'disabled';
    const configured = Boolean(
      enabled &&
        process.env.REVERSE_LOGISTICS_API_URL &&
        process.env.REVERSE_LOGISTICS_API_TOKEN,
    );

    return {
      enabled,
      provider,
      configured,
      message: enabled
        ? 'Logística reversa configurada parcialmente. Fluxo de geracao ainda precisa ser implementado.'
        : 'Logística reversa preparada, mas desativada até definição do fluxo operacional.',
    };
  }

  assertReady() {
    const status = this.getStatus();

    if (!status.enabled || !status.configured) {
      throw new Error(status.message);
    }
  }
}
