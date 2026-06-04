import { prisma } from '../lib/prisma';
import { decryptSecret, encryptSecret } from './SensitiveDataService';
import { EmailService } from './EmailService';

type MelhorEnvioTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number | string;
  token_type?: string;
  error?: string;
  error_description?: string;
  message?: string;
};

type TokenSnapshot = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt?: Date | null;
};

const TOKEN_STATE_ID = 1;
const ACCESS_TOKEN_REFRESH_THRESHOLD_MS = 5 * 24 * 60 * 60 * 1000;
const REFRESH_TOKEN_LIFETIME_MS = 45 * 24 * 60 * 60 * 1000;
const DEFAULT_REFRESH_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

const emailService = new EmailService();

function addMilliseconds(date: Date, milliseconds: number) {
  return new Date(date.getTime() + milliseconds);
}

function formatDate(value?: Date | null) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(value);
}

function decodeJwtPayload(token: string) {
  const [, payload] = String(token || '').split('.');

  if (!payload) {
    return null;
  }

  try {
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      '=',
    );

    return JSON.parse(Buffer.from(paddedPayload, 'base64').toString('utf8')) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
}

function getTokenExpiration(accessToken: string, fallback?: Date) {
  const payload = decodeJwtPayload(accessToken);
  const exp = Number(payload?.exp || 0);

  if (exp > 0) {
    return new Date(exp * 1000);
  }

  return fallback || addMilliseconds(new Date(), 30 * 24 * 60 * 60 * 1000);
}

function parseDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getBaseUrl() {
  const apiUrl = process.env.MELHOR_ENVIO_API_URL || 'https://sandbox.melhorenvio.com.br/api/v2/me';

  try {
    return new URL(apiUrl).origin;
  } catch {
    return 'https://sandbox.melhorenvio.com.br';
  }
}

function getTokenUrl() {
  return process.env.MELHOR_ENVIO_OAUTH_URL || `${getBaseUrl()}/oauth/token`;
}

function getRefreshCheckIntervalMs() {
  const interval = Number(process.env.MELHOR_ENVIO_REFRESH_CHECK_INTERVAL_MS || 0);

  return interval > 0 ? interval : DEFAULT_REFRESH_CHECK_INTERVAL_MS;
}

function getErrorMessage(data: MelhorEnvioTokenResponse | null, responseStatus?: number) {
  return (
    data?.message ||
    data?.error_description ||
    data?.error ||
    (responseStatus ? `Falha HTTP ${responseStatus}` : 'Erro desconhecido ao renovar token.')
  );
}

export class MelhorEnvioAuthService {
  private refreshPromise: Promise<TokenSnapshot> | null = null;
  private lastSnapshot: TokenSnapshot | null = null;

  async getAccessToken() {
    const snapshot = await this.getSnapshot();

    if (this.shouldRefresh(snapshot.accessTokenExpiresAt)) {
      return (await this.refreshAccessToken('scheduled')).accessToken;
    }

    return snapshot.accessToken;
  }

  async refreshAfterUnauthorized() {
    return this.refreshAccessToken('unauthenticated');
  }

  async checkAndRefreshIfNeeded(reason = 'scheduled') {
    const snapshot = await this.getSnapshot();

    if (!this.shouldRefresh(snapshot.accessTokenExpiresAt)) {
      return {
        refreshed: false,
        accessTokenExpiresAt: snapshot.accessTokenExpiresAt,
      };
    }

    const refreshedSnapshot = await this.refreshAccessToken(reason);

    return {
      refreshed: true,
      accessTokenExpiresAt: refreshedSnapshot.accessTokenExpiresAt,
    };
  }

  startScheduler() {
    if (process.env.NODE_ENV === 'test') {
      return null;
    }

    this.checkAndRefreshIfNeeded('startup').catch((error) => {
      console.error('[melhor-envio-auth] falha na verificacao inicial:', error);
    });

    const timer = setInterval(() => {
      this.checkAndRefreshIfNeeded('scheduled').catch((error) => {
        console.error('[melhor-envio-auth] falha na verificacao agendada:', error);
      });
    }, getRefreshCheckIntervalMs());

    timer.unref?.();
    return timer;
  }

  private shouldRefresh(accessTokenExpiresAt: Date) {
    return accessTokenExpiresAt.getTime() - Date.now() <= ACCESS_TOKEN_REFRESH_THRESHOLD_MS;
  }

  private async getSnapshot(): Promise<TokenSnapshot> {
    if (
      this.lastSnapshot &&
      this.lastSnapshot.accessTokenExpiresAt.getTime() - Date.now() > ACCESS_TOKEN_REFRESH_THRESHOLD_MS
    ) {
      return this.lastSnapshot;
    }

    const persistedSnapshot = await this.getPersistedSnapshot();

    if (persistedSnapshot) {
      this.lastSnapshot = persistedSnapshot;
      return persistedSnapshot;
    }

    const envSnapshot = await this.bootstrapFromEnvironment();

    if (envSnapshot) {
      this.lastSnapshot = envSnapshot;
      return envSnapshot;
    }

    throw new Error(
      'Erro de autenticação no Melhor Envio. Configure MELHOR_ENVIO_TOKEN e MELHOR_ENVIO_REFRESH_TOKEN.',
    );
  }

  private async getPersistedSnapshot(): Promise<TokenSnapshot | null> {
    const state = await prisma.melhorEnvioTokenState.findUnique({
      where: { id: TOKEN_STATE_ID },
    });

    if (!state) {
      return null;
    }

    const accessToken = decryptSecret(state.accessTokenEncrypted);
    const refreshToken = decryptSecret(state.refreshTokenEncrypted);

    if (!accessToken || !refreshToken) {
      throw new Error('ENCRYPTION_KEY não conseguiu descriptografar os tokens do Melhor Envio.');
    }

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt: state.accessTokenExpiresAt,
      refreshTokenExpiresAt: state.refreshTokenExpiresAt,
    };
  }

  private async bootstrapFromEnvironment(): Promise<TokenSnapshot | null> {
    const accessToken = process.env.MELHOR_ENVIO_TOKEN || '';
    const refreshToken = process.env.MELHOR_ENVIO_REFRESH_TOKEN || '';

    if (!accessToken) {
      return null;
    }

    const accessTokenExpiresAt =
      parseDate(process.env.MELHOR_ENVIO_TOKEN_EXPIRES_AT) || getTokenExpiration(accessToken);
    const refreshTokenExpiresAt =
      parseDate(process.env.MELHOR_ENVIO_REFRESH_TOKEN_EXPIRES_AT) ||
      (refreshToken ? addMilliseconds(new Date(), REFRESH_TOKEN_LIFETIME_MS) : null);

    if (!refreshToken) {
      return {
        accessToken,
        refreshToken: '',
        accessTokenExpiresAt,
        refreshTokenExpiresAt,
      };
    }

    const accessTokenEncrypted = encryptSecret(accessToken);
    const refreshTokenEncrypted = encryptSecret(refreshToken);

    if (!accessTokenEncrypted || !refreshTokenEncrypted) {
      throw new Error(
        'ENCRYPTION_KEY precisa estar configurada para persistir e renovar tokens do Melhor Envio.',
      );
    }

    await prisma.melhorEnvioTokenState.upsert({
      where: { id: TOKEN_STATE_ID },
      create: {
        id: TOKEN_STATE_ID,
        accessTokenEncrypted,
        refreshTokenEncrypted,
        accessTokenExpiresAt,
        refreshTokenExpiresAt,
      },
      update: {
        accessTokenEncrypted,
        refreshTokenEncrypted,
        accessTokenExpiresAt,
        refreshTokenExpiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
    };
  }

  private async refreshAccessToken(reason: string): Promise<TokenSnapshot> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performRefresh(reason).finally(() => {
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }

  private async performRefresh(reason: string): Promise<TokenSnapshot> {
    const snapshot = await this.getSnapshotWithoutRefresh();

    if (!snapshot.refreshToken) {
      const message = 'MELHOR_ENVIO_REFRESH_TOKEN não configurado.';
      await this.recordEvent('error', 'Falha ao renovar token do Melhor Envio', message, reason);
      throw new Error(message);
    }

    await prisma.melhorEnvioTokenState.update({
      where: { id: TOKEN_STATE_ID },
      data: {
        lastRefreshAttemptAt: new Date(),
        lastRefreshError: null,
      },
    });

    try {
      const response = await fetch(getTokenUrl(), {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'User-Agent':
            process.env.MELHOR_ENVIO_USER_AGENT ||
            'Thessara-Store/1.0 (thessarasemijoias@gmail.com)',
        },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          client_id: process.env.MELHOR_ENVIO_CLIENT_ID,
          client_secret: process.env.MELHOR_ENVIO_CLIENT_SECRET,
          redirect_uri: process.env.MELHOR_ENVIO_REDIRECT_URI,
          refresh_token: snapshot.refreshToken,
        }),
      });

      const data = (await response.json().catch(() => null)) as MelhorEnvioTokenResponse | null;

      if (!response.ok || !data?.access_token) {
        throw new Error(getErrorMessage(data, response.status));
      }

      const now = new Date();
      const accessToken = data.access_token;
      const refreshToken = data.refresh_token || snapshot.refreshToken;
      const expiresIn = Number(data.expires_in || 0);
      const accessTokenExpiresAt = getTokenExpiration(
        accessToken,
        expiresIn > 0 ? addMilliseconds(now, expiresIn * 1000) : undefined,
      );
      const refreshTokenExpiresAt = addMilliseconds(now, REFRESH_TOKEN_LIFETIME_MS);
      const accessTokenEncrypted = encryptSecret(accessToken);
      const refreshTokenEncrypted = encryptSecret(refreshToken);

      if (!accessTokenEncrypted || !refreshTokenEncrypted) {
        throw new Error(
          'ENCRYPTION_KEY precisa estar configurada para salvar o novo token do Melhor Envio.',
        );
      }

      await prisma.melhorEnvioTokenState.upsert({
        where: { id: TOKEN_STATE_ID },
        create: {
          id: TOKEN_STATE_ID,
          accessTokenEncrypted,
          refreshTokenEncrypted,
          accessTokenExpiresAt,
          refreshTokenExpiresAt,
          lastRefreshAttemptAt: now,
          lastRefreshSuccessAt: now,
          lastRefreshError: null,
        },
        update: {
          accessTokenEncrypted,
          refreshTokenEncrypted,
          accessTokenExpiresAt,
          refreshTokenExpiresAt,
          lastRefreshAttemptAt: now,
          lastRefreshSuccessAt: now,
          lastRefreshError: null,
        },
      });

      const refreshedSnapshot = {
        accessToken,
        refreshToken,
        accessTokenExpiresAt,
        refreshTokenExpiresAt,
      };

      process.env.MELHOR_ENVIO_TOKEN = accessToken;
      process.env.MELHOR_ENVIO_REFRESH_TOKEN = refreshToken;
      this.lastSnapshot = refreshedSnapshot;

      await this.recordEvent(
        'success',
        'Token do Melhor Envio renovado',
        `Renovacao automatica concluida. Novo access token válido até ${formatDate(
          accessTokenExpiresAt,
        )}.`,
        reason,
        accessTokenExpiresAt,
        refreshTokenExpiresAt,
      );

      return refreshedSnapshot;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido.';

      await prisma.melhorEnvioTokenState.update({
        where: { id: TOKEN_STATE_ID },
        data: {
          lastRefreshError: message,
        },
      });

      await this.recordEvent('error', 'Falha ao renovar token do Melhor Envio', message, reason);
      throw error;
    }
  }

  private async getSnapshotWithoutRefresh() {
    const persistedSnapshot = await this.getPersistedSnapshot();

    if (persistedSnapshot) {
      return persistedSnapshot;
    }

    const envSnapshot = await this.bootstrapFromEnvironment();

    if (envSnapshot) {
      return envSnapshot;
    }

    throw new Error('Tokens do Melhor Envio não configurados.');
  }

  private async recordEvent(
    status: 'success' | 'error',
    title: string,
    message: string,
    reason: string,
    accessTokenExpiresAt?: Date,
    refreshTokenExpiresAt?: Date | null,
  ) {
    await prisma.melhorEnvioTokenEvent.create({
      data: {
        status,
        title,
        message,
        metadata: {
          reason,
          accessTokenExpiresAt: accessTokenExpiresAt?.toISOString(),
          refreshTokenExpiresAt: refreshTokenExpiresAt?.toISOString(),
        },
      },
    });

    await emailService.sendOperationalAdminNotification({
      type: `melhor-envio-token-refresh-${status}`,
      subject: title,
      intro: message,
      rows: [
        { label: 'Motivo', value: reason },
        { label: 'Access token válido até', value: formatDate(accessTokenExpiresAt) },
        { label: 'Refresh token estimado até', value: formatDate(refreshTokenExpiresAt) },
      ],
    });
  }
}

export const melhorEnvioAuthService = new MelhorEnvioAuthService();
