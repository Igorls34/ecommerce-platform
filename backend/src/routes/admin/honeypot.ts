import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const honeypot = Router();

// Honeypot so ativo quando HONEYPOT_ENABLED=true
const HONEYPOT_ENABLED = process.env.HONEYPOT_ENABLED === 'true';

// ==========================================
// DADOS FICTICIOS REALISTAS
// ==========================================

const FAKE_CREDIT_CARDS = [
  { number: '4532 8721 0043 2189', holder: 'Mariana Oliveira Santos', expiry: '09/27', cvv: '482', brand: 'Visa', status: 'ativa', limit: 'R$ 12.500,00', used: 'R$ 4.230,00' },
  { number: '5491 7380 2145 6093', holder: 'Carlos Eduardo Silva', expiry: '03/26', cvv: '719', brand: 'Mastercard', status: 'ativa', limit: 'R$ 8.000,00', used: 'R$ 6.100,00' },
  { number: '4024 0071 5389 2104', holder: 'Ana Paula Ferreira', expiry: '12/28', cvv: '356', brand: 'Visa', status: 'bloqueada', limit: 'R$ 15.000,00', used: 'R$ 14.800,00' },
  { number: '5123 4567 8901 2346', holder: 'Pedro Henrique Costa', expiry: '06/25', cvv: '928', brand: 'Mastercard', status: 'ativa', limit: 'R$ 6.000,00', used: 'R$ 1.200,00' },
  { number: '4556 8234 1098 7652', holder: 'Juliana Mendes Almeida', expiry: '11/27', cvv: '641', brand: 'Visa', status: 'ativa', limit: 'R$ 20.000,00', used: 'R$ 8.900,00' },
  { number: '5234 5678 9012 3457', holder: 'Roberto Carlos Lima', expiry: '02/26', cvv: '183', brand: 'Mastercard', status: 'cancelada', limit: 'R$ 3.500,00', used: 'R$ 0,00' },
  { number: '4916 3345 8721 0098', holder: 'Fernanda Rodrigues', expiry: '08/29', cvv: '507', brand: 'Visa', status: 'ativa', limit: 'R$ 10.000,00', used: 'R$ 3.450,00' },
  { number: '5412 7534 9081 2364', holder: 'Lucas Almeida Pereira', expiry: '04/25', cvv: '832', brand: 'Mastercard', status: 'expirada', limit: 'R$ 7.500,00', used: 'R$ 7.500,00' },
];

const FAKE_DATABASE_DUMP = {
  database: 'thessara_prod_v3',
  host: '10.0.2.15',
  port: 3306,
  tables: [
    { name: 'customers', rows: 14832, size: '48.2 MB' },
    { name: 'orders', rows: 8291, size: '32.7 MB' },
    { name: 'order_items', rows: 24103, size: '18.4 MB' },
    { name: 'products', rows: 342, size: '12.1 MB' },
    { name: 'admin_users', rows: 3, size: '0.8 MB' },
    { name: 'payment_transactions', rows: 9104, size: '28.6 MB' },
    { name: 'sessions', rows: 2104, size: '6.3 MB' },
    { name: 'audit_log', rows: 45201, size: '124.8 MB' },
  ],
  lastBackup: '2026-05-29T03:00:00Z',
  backupSize: '312.4 MB',
  credentials: {
    root: { user: 'root', password: 'Th3ss@r@_Pr0d_2026!' },
    app: { user: 'thessara_app', password: 'ApP_s3cur3_K3y_9821' },
    readonly: { user: 'thessara_read', password: 'R3ad_0nly_2026!' },
  },
};

const FAKE_ADMIN_USERS = [
  { id: 1, name: 'Eliane Rodrigues', email: 'eliane@thessarasemijoias.com.br', role: 'owner', lastLogin: '2026-05-29T14:22:00Z', ip: '187.54.32.101', status: 'active' },
  { id: 2, name: 'Carlos Admin', email: 'carlos@thessarasemijoias.com.br', role: 'admin', lastLogin: '2026-05-28T09:15:00Z', ip: '187.54.32.102', status: 'active' },
  { id: 3, name: 'Suporte Loja', email: 'suporte@thessarasemijoias.com.br', role: 'staff', lastLogin: '2026-05-27T16:40:00Z', ip: '187.54.32.103', status: 'active' },
];

const FAKE_STRIPE_CONFIG = {
  live: {
    secret_key: 'sk_live_51H7xKz2eZvKYlo2C00000000000000000000000000000000000000000000',
    publishable_key: 'pk_live_51H7xKz2eZvKYlo2C00000000000000000000000000000000000000000000',
    webhook_secret: 'whsec_00000000000000000000000000000000000000000000000000000000',
    merchant_id: 'acct_1H7xKz2eZvKYlo2C',
  },
  test: {
    secret_key: 'sk_test_51H7xKz2eZvKYlo2C00000000000000000000000000000000000000000000',
    publishable_key: 'pk_test_51H7xKz2eZvKYlo2C00000000000000000000000000000000000000000000',
  },
};

const FAKE_API_KEYS = [
  { service: 'Melhor Envio', key: 'melhor_envio_token_8a3b2c1d4e5f6g7h8i9j0k1l2m3n4o5p', status: 'active', expires: '2027-01-15' },
  { service: 'Cloudinary', key: 'cloudinary://957482631177668:xYzAbCdEfGhIjKlMnOpQrStUvWx@thessara', status: 'active', expires: 'nunca' },
  { service: 'Mailtrap', key: 'mailtrap_api_token_abcdef1234567890abcdef1234567890', status: 'active', expires: 'nunca' },
  { service: 'ViaCEP', key: 'vacep_gratuito', status: 'active', expires: 'nunca' },
  { service: 'Google OAuth', key: 'GOOGLE_CLIENT_ID_123456789012-abcdefghijklmnopqrst.apps.googleusercontent.com', status: 'active', expires: '2027-06-01' },
];

const FAKE_ENV_VARIABLES = {
  DATABASE_URL: 'mysql://thessara_app:ApP_s3cur3_K3y_9821@10.0.2.15:3306/thessara_prod_v3',
  JWT_SECRET: 'jwt_s3cr3t_k3y_th3ss@r@_2026_pr0d!',
  JWT_SECRET_ADMIN: 'jwt_@dm1n_s3cr3t_k3y_2026!',
  ENCRYPTION_KEY: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
  STRIPE_SECRET_KEY: 'sk_live_51H7xKz2eZvKYlo2C00000000000000000000000000000000000000000000',
  STRIPE_WEBHOOK_SECRET: 'whsec_00000000000000000000000000000000000000000000000000000000',
  MELHOR_ENVIO_TOKEN: 'melhor_envio_token_8a3b2c1d4e5f6g7h8i9j0k1l2m3n4o5p',
  CLOUDINARY_URL: 'cloudinary://957482631177668:xYzAbCdEfGhIjKlMnOpQrStUvWx@thessara',
  MAILTRAP_API_TOKEN: 'mailtrap_api_token_abcdef1234567890abcdef1234567890',
  ADMIN_EMAIL: 'eliane@thessarasemijoias.com.br',
  ADMIN_PASSWORD: 'admin_thessara_2026!',
  STORE_ZIP_CODE: '01310-100',
};

const FAKE_ORDERS_DUMP = [
  { id: 1001, customer: 'Mariana Santos', email: 'mariana@email.com', total: 'R$ 459,90', status: 'PAID', payment: 'pix', items: '2x Anel Prata, 1x Brinco Pérola' },
  { id: 1002, customer: 'Carlos Silva', email: 'carlos@email.com', total: 'R$ 890,00', status: 'SHIPPED', payment: 'card', items: '1x Colar Ouro, 2x Pulseira' },
  { id: 1003, customer: 'Ana Ferreira', email: 'ana@email.com', total: 'R$ 1.250,00', status: 'DELIVERED', payment: 'pix', items: '1x Kit Noivas, 1x Tiara' },
  { id: 1004, customer: 'Pedro Costa', email: 'pedro@email.com', total: 'R$ 320,00', status: 'PENDING', payment: 'card', items: '3x Brinco Argola' },
  { id: 1005, customer: 'Juliana Almeida', email: 'juliana@email.com', total: 'R$ 2.100,00', status: 'PAID', payment: 'pix', items: '1x Colar Diamante, 2x Anel' },
];

// ==========================================
// SISTEMA DE LOG
// ==========================================

interface HoneypotLogEntry {
  timestamp: string;
  ip: string;
  method: string;
  path: string;
  userAgent: string;
  referrer: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
}

const LOG_DIR = path.resolve(process.cwd(), 'logs', 'honeypot');

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function getLogFile(): string {
  const date = new Date().toISOString().slice(0, 10);
  return path.join(LOG_DIR, `honeypot-${date}.json`);
}

function logAccess(entry: HoneypotLogEntry) {
  try {
    ensureLogDir();
    const logFile = getLogFile();
    const logs: HoneypotLogEntry[] = fs.existsSync(logFile)
      ? JSON.parse(fs.readFileSync(logFile, 'utf-8'))
      : [];
    logs.push(entry);
    fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
  } catch {
    // Falha silenciosa no log nao deve quebrar a aplicacao
  }
}

function getClientIp(req: Request): string {
  return String(
    req.headers['x-forwarded-for'] ||
    req.headers['x-real-ip'] ||
    req.socket.remoteAddress ||
    'unknown',
  ).split(',')[0].trim();
}

// ==========================================
// MIDDLEWARE DE CAPTURA
// ==========================================

function captureAccess(req: Request, _res: Response, next: Function) {
  if (!HONEYPOT_ENABLED) {
    return next();
  }

  const entry: HoneypotLogEntry = {
    timestamp: new Date().toISOString(),
    ip: getClientIp(req),
    method: req.method,
    path: req.originalUrl,
    userAgent: String(req.headers['user-agent'] || ''),
    referrer: String(req.headers['referer'] || ''),
    headers: {
      accept: String(req.headers['accept'] || ''),
      'accept-language': String(req.headers['accept-language'] || ''),
      'content-type': String(req.headers['content-type'] || ''),
      authorization: req.headers.authorization ? '[PRESENTE]' : '[AUSENTE]',
    },
    query: req.query as Record<string, string>,
    body: req.body && Object.keys(req.body).length > 0 ? '[PRESENTE]' : '[VAZIO]',
  };

  logAccess(entry);
  notifyAdmin(entry);
  next();
}

// ==========================================
// NOTIFICACAO POR E-MAIL
// ==========================================

let emailService: any = null;

function getEmailService() {
  if (!emailService) {
    try {
      const mod = require('../../services/EmailService');
      emailService = new mod.EmailService();
    } catch {
      // Se nao conseguir carregar, funciona sem notificacao
    }
  }
  return emailService;
}

function notifyAdmin(entry: HoneypotLogEntry) {
  const service = getEmailService();
  if (!service) return;

  const subject = `[HONEYPOT] Tentativa de acesso detectada - ${entry.path}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #dc3545; color: white; padding: 16px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">ALERTA DE SEGURANCA - HONEYPOT</h2>
      </div>
      <div style="background: #f8f9fa; padding: 20px; border: 1px solid #dee2e6;">
        <p><strong>Tentativa de acesso detectada em rota de armadilha!</strong></p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #dee2e6;">IP:</td><td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${entry.ip}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #dee2e6;">Rota:</td><td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${entry.method} ${entry.path}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #dee2e6;">Data/Hora:</td><td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${entry.timestamp}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #dee2e6;">User-Agent:</td><td style="padding: 8px; border-bottom: 1px solid #dee2e6; word-break: break-all;">${entry.userAgent}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #dee2e6;">Referrer:</td><td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${entry.referrer || 'Direto'}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Query:</td><td style="padding: 8px; word-break: break-all;">${JSON.stringify(entry.query)}</td></tr>
        </table>
      </div>
    </div>
  `;

  service.sendEmail({
    type: 'honeypot-alert',
    to: process.env.ADMIN_EMAIL || process.env.ADMIN_ORDER_EMAIL,
    template: { subject, text: `Honeypot: ${entry.method} ${entry.path} por ${entry.ip}`, html },
  }).catch(() => {});
}

// ==========================================
// ROTAS ISCA - PARECE REAL, MAS E ARMADILHA
// ==========================================

// Middleware comum para todas as rotas isca
honeypot.use(captureAccess);

// Rotas que parecem ser de admin/banco de dados
const fakeRoutes = Router();

// Backup do banco de dados
fakeRoutes.get('/backup-db', (_req: Request, res: Response) => {
  res.json({
    status: 'success',
    message: 'Backup gerado com sucesso',
    data: FAKE_DATABASE_DUMP,
    download_url: '/admin/internal/backup/thessara_prod_2026-05-29.sql.gz',
    size: '312.4 MB',
    checksum: 'sha256:a1b2c3d4e5f6...',
  });
});

// Listagem de cartoes de clientes
fakeRoutes.get('/credit-cards', (_req: Request, res: Response) => {
  res.json({
    status: 'success',
    total: FAKE_CREDIT_CARDS.length,
    cards: FAKE_CREDIT_CARDS,
    warning: 'Dados sensiveis - acesso restrito',
  });
});

// Dump de usuarios admin
fakeRoutes.get('/admin-users', (_req: Request, res: Response) => {
  res.json({
    status: 'success',
    users: FAKE_ADMIN_USERS,
    total: FAKE_ADMIN_USERS.length,
  });
});

// Configuracoes do Stripe
fakeRoutes.get('/stripe-config', (_req: Request, res: Response) => {
  res.json({
    status: 'success',
    config: FAKE_STRIPE_CONFIG,
    environment: 'production',
  });
});

// Chaves de API
fakeRoutes.get('/api-keys', (_req: Request, res: Response) => {
  res.json({
    status: 'success',
    keys: FAKE_API_KEYS,
    total: FAKE_API_KEYS.length,
  });
});

// Variaveis de ambiente
fakeRoutes.get('/env', (_req: Request, res: Response) => {
  res.json({
    status: 'success',
    environment: 'production',
    variables: FAKE_ENV_VARIABLES,
  });
});

// Dump de pedidos
fakeRoutes.get('/orders-dump', (_req: Request, res: Response) => {
  res.json({
    status: 'success',
    total: FAKE_ORDERS_DUMP.length,
    orders: FAKE_ORDERS_DUMP,
    exported_at: new Date().toISOString(),
  });
});

// Endpoint de debug
fakeRoutes.get('/debug', (_req: Request, res: Response) => {
  res.json({
    status: 'success',
    debug: {
      node_version: process.version,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      env: process.env.NODE_ENV,
      pid: process.pid,
      platform: process.platform,
    },
  });
});

// Configuracao do banco
fakeRoutes.get('/db-config', (_req: Request, res: Response) => {
  res.json({
    status: 'success',
    config: {
      host: FAKE_DATABASE_DUMP.host,
      port: FAKE_DATABASE_DUMP.port,
      database: FAKE_DATABASE_DUMP.database,
      credentials: FAKE_DATABASE_DUMP.credentials,
      ssl: true,
      connection_pool: { min: 2, max: 10 },
    },
  });
});

// Rota de status do sistema
fakeRoutes.get('/system-status', (_req: Request, res: Response) => {
  res.json({
    status: 'success',
    system: {
      server: 'Ubuntu 22.04 LTS',
      nginx: '1.24.0',
      node: process.version,
      mysql: '8.0.36',
      disk_usage: '47.2%',
      ram_usage: '2.8 GB / 4 GB',
      cpu_load: '0.42',
      active_connections: 23,
      ssl_expiry: '2027-03-15',
    },
  });
});

// ==========================================
// ROTAS ISCA QUE RETORNAM ERROS REALISTAS
// ==========================================

// Rota que parece precisar de permissao especial
fakeRoutes.get('/super-admin', (_req: Request, res: Response) => {
  res.status(403).json({
    error: 'Nível de acesso inválido',
    required_level: 'super_admin',
    your_level: 'admin',
    message: 'Você não tem permissão para acessar esta área. Contate o super administrador.',
    support_email: 'admin@thessarasemijoias.com.br',
  });
});

// Rota que parece ser de production
fakeRoutes.get('/production-secrets', (_req: Request, res: Response) => {
  res.status(403).json({
    error: 'Acesso restrito ao ambiente de produção',
    environment_required: 'production',
    environment_detected: 'development',
    message: 'Esta rota só funciona em produção.',
  });
});

// Rota de migracao
fakeRoutes.get('/migrate-db', (_req: Request, res: Response) => {
  res.status(403).json({
    error: 'Operação bloqueada',
    message: 'Migrações devem ser feitas via CI/CD. Acesso manual bloqueado.',
    required_flag: '--allow-migration',
  });
});

// ==========================================
// EXPORT - so registra rotas se HONEYPOT_ENABLED=true
// ==========================================

const noopRouter = Router();

function getHoneypotRoutes() {
  if (!HONEYPOT_ENABLED) {
    return noopRouter;
  }

  const mainIsca = Router();
  mainIsca.use('/admin/honeypot', fakeRoutes);

  // Rotas que bots scanners procuram
  mainIsca.get('/wp-admin', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Rota não encontrada' });
  });

  mainIsca.get('/wp-login.php', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Rota não encontrada' });
  });

  mainIsca.get('/.env', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Rota não encontrada' });
  });

  mainIsca.get('/phpmyadmin', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Rota não encontrada' });
  });

  mainIsca.get('/admin/phpmyadmin', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Rota não encontrada' });
  });

  mainIsca.get('/administrator', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Rota não encontrada' });
  });

  mainIsca.get('/server-status', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Rota não encontrada' });
  });

  mainIsca.get('/server-info', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Rota não encontrada' });
  });

  mainIsca.get('/admin/debug', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Rota não encontrada' });
  });

  mainIsca.get('/admin/backup', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Rota não encontrada' });
  });

  return mainIsca;
}

export { getHoneypotRoutes as honeypotRoutes };
