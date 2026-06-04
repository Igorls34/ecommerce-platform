const path = require('path');
const fs = require('fs/promises');
const jwt = require('jsonwebtoken');

const projectRoot = path.resolve(__dirname, '..', '..');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.JWT_SECRET_ADMIN = process.env.JWT_SECRET_ADMIN || 'test-jwt-secret';
process.env.UPLOAD_PROVIDER = 'local';
process.env.NODE_ENV = 'test';
process.env.PAYMENT_PROVIDER = 'local';
process.env.PAYMENT_PIX_PROVIDER = 'local';
process.env.PAYMENT_CARD_PROVIDER = 'stripe';
delete process.env.STRIPE_SECRET_KEY;
delete process.env.STRIPE_WEBHOOK_SECRET;
delete process.env.MERCADO_PAGO_ACCESS_TOKEN;
delete process.env.MERCADO_PAGO_WEBHOOK_URL;
delete process.env.MERCADO_PAGO_NOTIFICATION_URL;

const { createApp } = require('../../src/app');
const { prisma } = require('../../src/lib/prisma');

function createToken(payload = {}) {
  return jwt.sign(
    {
      sub: '1',
      email: 'admin@teste.com',
      role: 'admin',
      ...payload,
    },
    process.env.JWT_SECRET_ADMIN || process.env.JWT_SECRET,
    { expiresIn: '1h' },
  );
}

async function startTestServer() {
  const app = createApp();

  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${port}`,
      });
    });
  });
}

async function stopTestServer(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function stubMethod(target, methodName, implementation) {
  const original = target[methodName];
  target[methodName] = implementation;

  return () => {
    target[methodName] = original;
  };
}

async function removeUploadedFileFromUrl(imageUrl) {
  if (!imageUrl) {
    return;
  }

  const [, relativePath] = imageUrl.split('/uploads/');

  if (!relativePath) {
    return;
  }

  const filePath = path.join(projectRoot, 'uploads', relativePath);
  await fs.unlink(filePath).catch(() => undefined);
}

module.exports = {
  createToken,
  prisma,
  removeUploadedFileFromUrl,
  startTestServer,
  stopTestServer,
  stubMethod,
};
