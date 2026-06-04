const assert = require('node:assert/strict');

const {
  createToken,
  prisma,
  startTestServer,
  stopTestServer,
  stubMethod,
} = require('./helpers/testServer');
const { PaymentService } = require('../src/services/PaymentService');

module.exports = [
  {
    name: 'POST /webhook/mercado-pago marks approved payment as paid once',
    async run() {
      let verifyCalled = false;
      let transactionCalled = false;
      const restoreVerify = stubMethod(
        PaymentService.prototype,
        'verifyMercadoPagoWebhookSignature',
        () => {
          verifyCalled = true;
        },
      );
      const restoreGetPayment = stubMethod(
        PaymentService.prototype,
        'getMercadoPagoPayment',
        async () => ({
          id: 123456,
          status: 'approved',
          external_reference: '91',
          date_approved: '2026-05-23T12:00:00.000Z',
        }),
      );
      const restoreFindUnique = stubMethod(prisma.order, 'findUnique', async () => ({
        id: 91,
        status: 'PENDING',
        paidAt: null,
        customer: {
          id: 4,
          name: 'Maria Silva',
          email: 'maria@teste.com',
        },
        items: [{ productId: 15, quantity: 1 }],
      }));
      const restoreTransaction = stubMethod(prisma, '$transaction', async (callback) => {
        transactionCalled = true;
        return callback({
          order: {
            findUnique: async () => ({
              id: 91,
              status: 'PENDING',
              customer: {
                id: 4,
                name: 'Maria Silva',
                email: 'maria@teste.com',
              },
              items: [{ productId: 15, quantity: 1 }],
            }),
            update: async ({ data }) => ({
              id: 91,
              ...data,
              customer: {
                id: 4,
                name: 'Maria Silva',
                email: 'maria@teste.com',
              },
              items: [],
            }),
          },
          product: {
            updateMany: async () => ({ count: 1 }),
          },
          orderEvent: {
            create: async () => ({}),
          },
        });
      });
      const restoreOrderEventCreate = stubMethod(prisma.orderEvent, 'create', async () => ({}));

      const { server, baseUrl } = await startTestServer();

      try {
        const response = await fetch(`${baseUrl}/webhook/mercado-pago`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-request-id': 'request-123',
            'x-signature': 'ts=1,v1=test',
          },
          body: JSON.stringify({
            type: 'payment',
            data: { id: '123456' },
          }),
        });

        assert.equal(response.status, 200);
        assert.equal(verifyCalled, true);
        assert.equal(transactionCalled, true);
      } finally {
        restoreVerify();
        restoreGetPayment();
        restoreFindUnique();
        restoreTransaction();
        restoreOrderEventCreate();
        await stopTestServer(server);
      }
    },
  },
  {
    name: 'POST /webhook/mercado-pago ignores already paid order',
    async run() {
      let transactionCalled = false;
      const restoreVerify = stubMethod(
        PaymentService.prototype,
        'verifyMercadoPagoWebhookSignature',
        () => undefined,
      );
      const restoreGetPayment = stubMethod(
        PaymentService.prototype,
        'getMercadoPagoPayment',
        async () => ({
          id: 123456,
          status: 'approved',
          external_reference: '91',
        }),
      );
      const restoreFindUnique = stubMethod(prisma.order, 'findUnique', async () => ({
        id: 91,
        status: 'PAID',
        customer: {
          id: 4,
          name: 'Maria Silva',
          email: 'maria@teste.com',
        },
        items: [{ productId: 15, quantity: 1 }],
      }));
      const restoreTransaction = stubMethod(prisma, '$transaction', async () => {
        transactionCalled = true;
      });

      const { server, baseUrl } = await startTestServer();

      try {
        const response = await fetch(`${baseUrl}/webhook/mercado-pago`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-request-id': 'request-duplicate',
            'x-signature': 'ts=1,v1=test',
          },
          body: JSON.stringify({
            type: 'payment',
            data: { id: '123456' },
          }),
        });

        const body = await response.json();
        assert.equal(response.status, 200);
        assert.equal(body.alreadyProcessed, true);
        assert.equal(transactionCalled, false);
      } finally {
        restoreVerify();
        restoreGetPayment();
        restoreFindUnique();
        restoreTransaction();
        await stopTestServer(server);
      }
    },
  },
  {
    name: 'GET /admin/orders returns organized order list for authenticated admin',
    async run() {
      const restoreFindMany = stubMethod(prisma.order, 'findMany', async () => [
        {
          id: 91,
          total: '319.80',
          status: 'PAID',
          orderNotes: 'Entregar no periodo da tarde',
          createdAt: '2026-04-24T12:00:00.000Z',
          updatedAt: '2026-04-24T12:10:00.000Z',
          customer: {
            id: 4,
            name: 'Maria Silva',
            email: 'maria@teste.com',
            phone: '11999998888',
          },
          items: [
            {
              id: 1,
              quantity: 2,
              price: '159.90',
              productId: 15,
              product: {
                id: 15,
                name: 'Colar Aurora',
                imageUrl: '/uploads/colar-aurora.webp',
              },
            },
          ],
        },
      ]);

      const { server, baseUrl } = await startTestServer();

      try {
        const response = await fetch(`${baseUrl}/admin/orders`, {
          headers: {
            Authorization: `Bearer ${createToken()}`,
          },
        });

        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), [
          {
            id: 91,
            total: '319.80',
            status: 'PAID',
            orderNotes: 'Entregar no periodo da tarde',
            createdAt: '2026-04-24T12:00:00.000Z',
            updatedAt: '2026-04-24T12:10:00.000Z',
            customer: {
              id: 4,
              name: 'Maria Silva',
              email: 'maria@teste.com',
              phone: '11999998888',
            },
            items: [
              {
                id: 1,
                quantity: 2,
                price: '159.90',
                productId: 15,
                product: {
                  id: 15,
                  name: 'Colar Aurora',
                  imageUrl: '/uploads/colar-aurora.webp',
                },
              },
            ],
          },
        ]);
      } finally {
        restoreFindMany();
        await stopTestServer(server);
      }
    },
  },
  {
    name: 'GET /admin/orders/:id returns 404 when order does not exist',
    async run() {
      const restoreFindUnique = stubMethod(prisma.order, 'findUnique', async () => null);

      const { server, baseUrl } = await startTestServer();

      try {
        const response = await fetch(`${baseUrl}/admin/orders/999`, {
          headers: {
            Authorization: `Bearer ${createToken()}`,
          },
        });

        assert.equal(response.status, 404);
        assert.deepEqual(await response.json(), {
          error: 'Pedido nao encontrado.',
        });
      } finally {
        restoreFindUnique();
        await stopTestServer(server);
      }
    },
  },
  {
    name: 'GET /store/orders/:id only returns orders owned by authenticated customer',
    async run() {
      let queryWhere = null;
      const restoreFindFirst = stubMethod(prisma.order, 'findFirst', async (query) => {
        queryWhere = query.where;
        return null;
      });

      const { server, baseUrl } = await startTestServer();

      try {
        const response = await fetch(`${baseUrl}/store/orders/99`, {
          headers: {
            Authorization: `Bearer ${createToken({ sub: '22', role: 'customer' })}`,
          },
        });

        assert.equal(response.status, 404);
        assert.deepEqual(await response.json(), {
          error: 'Pedido nao encontrado.',
        });
        assert.deepEqual(queryWhere, {
          id: 99,
          customerId: 22,
        });
      } finally {
        restoreFindFirst();
        await stopTestServer(server);
      }
    },
  },
  {
    name: 'GET /store/orders/:id/payment returns payment data only for authenticated customer',
    async run() {
      let queryWhere = null;
      const expiresAt = new Date(Date.now() + 20 * 60 * 1000);
      const restoreFindFirst = stubMethod(prisma.order, 'findFirst', async (query) => {
        queryWhere = query.where;
        return {
          id: 77,
          total: '199.90',
          status: 'PENDING',
          paymentMethod: 'pix',
          paymentReference: 'pix-copia-e-cola',
          paymentExpiresAt: expiresAt,
          expiredAt: null,
          paidAt: null,
          events: [],
          customer: {
            id: 22,
            name: 'Cliente Teste',
            email: 'cliente@teste.com',
          },
          items: [],
        };
      });

      const { server, baseUrl } = await startTestServer();

      try {
        const response = await fetch(`${baseUrl}/store/orders/77/payment`, {
          headers: {
            Authorization: `Bearer ${createToken({ sub: '22', role: 'customer' })}`,
          },
        });

        assert.equal(response.status, 200);
        const body = await response.json();
        assert.deepEqual(queryWhere, {
          id: 77,
          customerId: 22,
        });
        assert.equal(body.orderId, 77);
        assert.equal(body.paymentStatus, 'PENDING');
        assert.equal(body.pix.copyPaste, 'pix-copia-e-cola');
        assert.equal(body.canRetryPayment, true);
      } finally {
        restoreFindFirst();
        await stopTestServer(server);
      }
    },
  },
  {
    name: 'PUT /admin/orders/:id/status updates status and shipping data',
    async run() {
      const restoreUpdate = stubMethod(prisma.order, 'update', async (input) => ({
        id: input.where.id,
        total: '319.80',
        status: input.data.status,
        trackingCode: input.data.trackingCode,
        shippingNotes: input.data.shippingNotes,
        trackingToken: 'tracking-token',
        customer: {
          id: 4,
          name: 'Maria Silva',
          email: 'maria@teste.com',
        },
        items: [],
      }));

      const { server, baseUrl } = await startTestServer();

      try {
        const response = await fetch(`${baseUrl}/admin/orders/91/status`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${createToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'SHIPPED',
            trackingCode: 'BR123456789',
            shippingNotes: 'Saiu para entrega.',
          }),
        });

        assert.equal(response.status, 200);
        const body = await response.json();
        assert.equal(body.status, 'SHIPPED');
        assert.equal(body.trackingCode, 'BR123456789');
        assert.equal(body.shippingNotes, 'Saiu para entrega.');
      } finally {
        restoreUpdate();
        await stopTestServer(server);
      }
    },
  },
  {
    name: 'GET /store/orders/tracking/:token returns public order tracking',
    async run() {
      const restoreFindUnique = stubMethod(prisma.order, 'findUnique', async (input) => ({
        id: 91,
        total: '319.80',
        status: 'SHIPPED',
        trackingToken: input.where.trackingToken,
        trackingCode: 'BR123456789',
        shippingNotes: 'Saiu para entrega.',
        customer: {
          name: 'Maria Silva',
          email: 'maria@teste.com',
        },
        items: [],
      }));

      const { server, baseUrl } = await startTestServer();

      try {
        const response = await fetch(`${baseUrl}/store/orders/tracking/token-123`);

        assert.equal(response.status, 200);
        const body = await response.json();
        assert.equal(body.trackingToken, 'token-123');
        assert.equal(body.status, 'SHIPPED');
      } finally {
        restoreFindUnique();
        await stopTestServer(server);
      }
    },
  },
];
