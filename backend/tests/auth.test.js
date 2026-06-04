const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');

const { prisma, startTestServer, stopTestServer, stubMethod } = require('./helpers/testServer');
const { EmailService } = require('../src/services/EmailService');

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = [
  {
    name: 'POST /admin/login returns 400 when credentials are missing',
    async run() {
      const { server, baseUrl } = await startTestServer();

      try {
        const response = await fetch(`${baseUrl}/admin/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: '', password: '' }),
        });

        assert.equal(response.status, 400);
        assert.deepEqual(await response.json(), {
          error: 'E-mail e senha sao obrigatorios.',
        });
      } finally {
        await stopTestServer(server);
      }
    },
  },
  {
    name: 'POST /admin/login returns token for valid credentials',
    async run() {
      const restoreFindUnique = stubMethod(prisma.adminUser, 'findUnique', async () => ({
        id: 7,
        name: 'Administrador',
        email: 'admin@eliane.com',
        password: await bcrypt.hash('admin123', 10),
      }));

      const { server, baseUrl } = await startTestServer();

      try {
        const response = await fetch(`${baseUrl}/admin/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: 'admin@eliane.com',
            password: 'admin123',
          }),
        });

        assert.equal(response.status, 200);

        const body = await response.json();
        assert.equal(typeof body.token, 'string');
        assert.equal(body.admin.email, 'admin@eliane.com');
        assert.equal(body.admin.id, 7);
      } finally {
        restoreFindUnique();
        await stopTestServer(server);
      }
    },
  },
  {
    name: 'GET /admin/products denies access without token',
    async run() {
      const { server, baseUrl } = await startTestServer();

      try {
        const response = await fetch(`${baseUrl}/admin/products`);

        assert.equal(response.status, 401);
        assert.deepEqual(await response.json(), {
          error: 'Token nao informado.',
        });
      } finally {
        await stopTestServer(server);
      }
    },
  },
  {
    name: 'POST /store/auth/password-reset/request sends neutral response and reset email',
    async run() {
      const originalPasswordResetToken = prisma.passwordResetToken;
      let createdToken = null;
      let resetUrl = '';

      prisma.passwordResetToken = {
        deleteMany: async () => ({ count: 0 }),
        create: async ({ data }) => {
          createdToken = data;
          return { id: 1, ...data };
        },
      };

      const restoreCustomerFindUnique = stubMethod(prisma.customer, 'findUnique', async () => ({
        id: 14,
        name: 'Cliente',
        email: 'cliente@teste.com',
      }));
      const restoreEmail = stubMethod(
        EmailService.prototype,
        'sendPasswordReset',
        async (_to, url) => {
          resetUrl = url;
        },
      );
      const { server, baseUrl } = await startTestServer();

      try {
        const response = await fetch(`${baseUrl}/store/auth/password-reset/request`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: 'cliente@teste.com' }),
        });

        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), {
          message: 'Se existir uma conta com este e-mail, enviaremos um link para redefinir a senha.',
        });
        assert.equal(createdToken.customerId, 14);
        assert.equal(createdToken.tokenHash.length, 64);
        assert.match(resetUrl, /\/redefinir-senha\/[a-f0-9]{64}$/);
      } finally {
        prisma.passwordResetToken = originalPasswordResetToken;
        restoreCustomerFindUnique();
        restoreEmail();
        await stopTestServer(server);
      }
    },
  },
  {
    name: 'POST /store/auth/password-reset/confirm updates password and returns customer session',
    async run() {
      const originalPasswordResetToken = prisma.passwordResetToken;
      const rawToken = 'token-de-teste';
      const customer = {
        id: 22,
        name: 'Cliente Reset',
        email: 'reset@teste.com',
        phone: null,
        avatarUrl: null,
        leadSource: 'store_register',
        marketingOptIn: true,
      };
      let updatedPassword = '';

      prisma.passwordResetToken = {
        findUnique: async ({ where }) => {
          assert.equal(where.tokenHash, hashResetToken(rawToken));
          return {
            id: 9,
            customerId: customer.id,
            tokenHash: where.tokenHash,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            usedAt: null,
            customer,
          };
        },
        update: async () => ({}),
        deleteMany: async () => ({ count: 0 }),
      };

      const restoreCustomerUpdate = stubMethod(prisma.customer, 'update', async ({ data }) => {
        updatedPassword = data.password;
        return { ...customer, ...data };
      });
      const restoreTransaction = stubMethod(prisma, '$transaction', async (operations) =>
        Promise.all(operations),
      );
      const { server, baseUrl } = await startTestServer();

      try {
        const response = await fetch(`${baseUrl}/store/auth/password-reset/confirm`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: rawToken, password: 'nova-senha-123' }),
        });

        assert.equal(response.status, 200);

        const body = await response.json();
        assert.equal(typeof body.token, 'string');
        assert.equal(body.customer.email, customer.email);
        assert.equal(await bcrypt.compare('nova-senha-123', updatedPassword), true);
      } finally {
        prisma.passwordResetToken = originalPasswordResetToken;
        restoreCustomerUpdate();
        restoreTransaction();
        await stopTestServer(server);
      }
    },
  },
];
