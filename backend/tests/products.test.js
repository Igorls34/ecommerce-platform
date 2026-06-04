const assert = require('node:assert/strict');

const {
  createToken,
  prisma,
  removeUploadedFileFromUrl,
  startTestServer,
  stopTestServer,
  stubMethod,
} = require('./helpers/testServer');

module.exports = [
  {
    name: 'GET /admin/categories returns category list for authenticated admin',
    async run() {
      const restoreFindMany = stubMethod(prisma.category, 'findMany', async () => [
        { id: 1, name: 'Aneis' },
        { id: 2, name: 'Colares' },
      ]);

      const { server, baseUrl } = await startTestServer();

      try {
        const response = await fetch(`${baseUrl}/admin/categories`, {
          headers: {
            Authorization: `Bearer ${createToken()}`,
          },
        });

        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), [
          { id: 1, name: 'Aneis' },
          { id: 2, name: 'Colares' },
        ]);
      } finally {
        restoreFindMany();
        await stopTestServer(server);
      }
    },
  },
  {
    name: 'POST /admin/categories creates a category for authenticated admin',
    async run() {
      let createPayload = null;
      const restoreFindFirst = stubMethod(prisma.category, 'findFirst', async () => null);
      const restoreCreate = stubMethod(prisma.category, 'create', async ({ data }) => {
        createPayload = data;

        return {
          id: 3,
          ...data,
        };
      });

      const { server, baseUrl } = await startTestServer();

      try {
        const response = await fetch(`${baseUrl}/admin/categories`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${createToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'Pulseiras',
            imageUrl: 'http://localhost:3333/uploads/pulseiras.png',
          }),
        });

        assert.equal(response.status, 201);
        assert.deepEqual(await response.json(), {
          id: 3,
          name: 'Pulseiras',
          imageUrl: '/uploads/pulseiras.png',
        });
        assert.deepEqual(createPayload, {
          name: 'Pulseiras',
          imageUrl: '/uploads/pulseiras.png',
        });
      } finally {
        restoreFindFirst();
        restoreCreate();
        await stopTestServer(server);
      }
    },
  },
  {
    name: 'POST /admin/categories returns 400 when category already exists',
    async run() {
      const restoreFindFirst = stubMethod(prisma.category, 'findFirst', async () => ({
        id: 1,
        name: 'Aneis',
      }));

      const { server, baseUrl } = await startTestServer();

      try {
        const response = await fetch(`${baseUrl}/admin/categories`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${createToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'Aneis',
          }),
        });

        assert.equal(response.status, 400);
        assert.deepEqual(await response.json(), {
          error: 'Categoria ja cadastrada.',
        });
      } finally {
        restoreFindFirst();
        await stopTestServer(server);
      }
    },
  },
  {
    name: 'PUT /admin/categories/:id updates an existing category',
    async run() {
      let updatePayload = null;
      const restoreFindUnique = stubMethod(prisma.category, 'findUnique', async () => ({
        id: 3,
        name: 'Colares',
        imageUrl: null,
      }));
      const restoreFindFirst = stubMethod(prisma.category, 'findFirst', async () => null);
      const restoreUpdate = stubMethod(prisma.category, 'update', async ({ data }) => {
        updatePayload = data;

        return {
          id: 3,
          ...data,
        };
      });

      const { server, baseUrl } = await startTestServer();

      try {
        const response = await fetch(`${baseUrl}/admin/categories/3`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${createToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'Colares Premium',
            imageUrl: 'http://localhost:3333/uploads/colares-premium.png',
          }),
        });

        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), {
          id: 3,
          name: 'Colares Premium',
          imageUrl: '/uploads/colares-premium.png',
        });
        assert.deepEqual(updatePayload, {
          name: 'Colares Premium',
          imageUrl: '/uploads/colares-premium.png',
        });
      } finally {
        restoreFindUnique();
        restoreFindFirst();
        restoreUpdate();
        await stopTestServer(server);
      }
    },
  },
  {
    name: 'DELETE /admin/categories/:id rejects deletion when category has linked products',
    async run() {
      const restoreFindUnique = stubMethod(prisma.category, 'findUnique', async () => ({
        id: 2,
        name: 'Aneis',
      }));
      const restoreCount = stubMethod(prisma.product, 'count', async () => 4);

      const { server, baseUrl } = await startTestServer();

      try {
        const response = await fetch(`${baseUrl}/admin/categories/2`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${createToken()}`,
          },
        });

        assert.equal(response.status, 400);
        assert.deepEqual(await response.json(), {
          error: 'Nao e possivel excluir uma categoria vinculada a produtos.',
        });
      } finally {
        restoreFindUnique();
        restoreCount();
        await stopTestServer(server);
      }
    },
  },
  {
    name: 'DELETE /admin/categories/:id removes an unused category',
    async run() {
      const restoreFindUnique = stubMethod(prisma.category, 'findUnique', async () => ({
        id: 8,
        name: 'Pulseiras',
      }));
      const restoreCount = stubMethod(prisma.product, 'count', async () => 0);
      const restoreDelete = stubMethod(prisma.category, 'delete', async () => ({
        id: 8,
      }));

      const { server, baseUrl } = await startTestServer();

      try {
        const response = await fetch(`${baseUrl}/admin/categories/8`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${createToken()}`,
          },
        });

        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), {
          message: 'Categoria eliminada com sucesso.',
        });
      } finally {
        restoreFindUnique();
        restoreCount();
        restoreDelete();
        await stopTestServer(server);
      }
    },
  },
  {
    name: 'GET /admin/products returns product list for authenticated admin',
    async run() {
      const restoreFindMany = stubMethod(prisma.product, 'findMany', async () => [
        {
          id: 2,
          name: 'Colar',
          description: 'Banho dourado',
          price: '149.90',
          stock: 8,
          categoryId: 1,
          category: {
            id: 1,
            name: 'Aneis',
          },
          imageUrl: null,
        },
      ]);

      const { server, baseUrl } = await startTestServer();

      try {
        const response = await fetch(`${baseUrl}/admin/products`, {
          headers: {
            Authorization: `Bearer ${createToken()}`,
          },
        });

        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), [
          {
            id: 2,
            name: 'Colar',
            description: 'Banho dourado',
            price: '149.90',
            stock: 8,
            categoryId: 1,
            category: {
              id: 1,
              name: 'Aneis',
            },
            imageUrl: null,
          },
        ]);
      } finally {
        restoreFindMany();
        await stopTestServer(server);
      }
    },
  },
  {
    name: 'GET /admin/customers returns captured customers for authenticated admin',
    async run() {
      const restoreFindMany = stubMethod(prisma.customer, 'findMany', async () => [
        {
          id: 4,
          name: 'Cliente Google',
          email: 'cliente@teste.com',
          phone: null,
          avatarUrl: 'https://example.com/avatar.png',
          leadSource: 'google',
          marketingOptIn: true,
          lastLoginAt: '2026-04-16T12:00:00.000Z',
          createdAt: '2026-04-16T11:00:00.000Z',
          _count: {
            orders: 0,
          },
        },
      ]);

      const { server, baseUrl } = await startTestServer();

      try {
        const response = await fetch(`${baseUrl}/admin/customers`, {
          headers: {
            Authorization: `Bearer ${createToken()}`,
          },
        });

        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), [
          {
            id: 4,
            name: 'Cliente Google',
            email: 'cliente@teste.com',
            phone: null,
            avatarUrl: 'https://example.com/avatar.png',
            leadSource: 'google',
            marketingOptIn: true,
            lastLoginAt: '2026-04-16T12:00:00.000Z',
            createdAt: '2026-04-16T11:00:00.000Z',
            _count: {
              orders: 0,
            },
          },
        ]);
      } finally {
        restoreFindMany();
        await stopTestServer(server);
      }
    },
  },
  // Notificacoes do admin desativadas por enquanto.
  // Para reativar, restaure a rota GET /admin/notifications e este teste.
  // {
  //   name: 'GET /admin/notifications returns realtime admin alerts',
  //   async run() {
  //     const now = new Date('2026-04-16T12:00:00.000Z');
  //     const restoreProductFindMany = stubMethod(prisma.product, 'findMany', async () => ([
  //       {
  //         id: 8,
  //         name: 'Anel Estoque',
  //         stock: 0,
  //         updatedAt: now,
  //       },
  //     ]));
  //     const restoreLeadFindMany = stubMethod(prisma.productAvailabilityLead, 'findMany', async () => []);
  //     const restoreCustomerFindMany = stubMethod(prisma.customer, 'findMany', async () => []);
  //     const restoreOrderFindMany = stubMethod(prisma.order, 'findMany', async () => []);
  //
  //     const { server, baseUrl } = await startTestServer();
  //
  //     try {
  //       const response = await fetch(`${baseUrl}/admin/notifications`, {
  //         headers: {
  //           Authorization: `Bearer ${createToken()}`,
  //         },
  //       });
  //
  //       const body = await response.json();
  //       assert.equal(response.status, 200);
  //       assert.equal(body.counts.danger, 1);
  //       assert.equal(body.notifications[0].type, 'stock_out');
  //       assert.equal(body.notifications[0].message, 'Anel Estoque esta sem estoque.');
  //     } finally {
  //       restoreProductFindMany();
  //       restoreLeadFindMany();
  //       restoreCustomerFindMany();
  //       restoreOrderFindMany();
  //       await stopTestServer(server);
  //     }
  //   },
  // },
  {
    name: 'GET /store/products returns public catalog list',
    async run() {
      const restoreFindMany = stubMethod(prisma.product, 'findMany', async () => [
        {
          id: 5,
          name: 'Brinco Aurora',
          description: 'Banho dourado',
          price: '89.90',
          stock: 7,
          categoryId: 2,
          category: {
            id: 2,
            name: 'Brincos',
          },
          imageUrl: '/uploads/brinco.png',
        },
      ]);

      const { server, baseUrl } = await startTestServer();

      try {
        const response = await fetch(`${baseUrl}/store/products`);

        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), [
          {
            id: 5,
            name: 'Brinco Aurora',
            description: 'Banho dourado',
            price: '89.90',
            stock: 7,
            categoryId: 2,
            category: {
              id: 2,
              name: 'Brincos',
            },
            imageUrl: '/uploads/brinco.png',
          },
        ]);
      } finally {
        restoreFindMany();
        await stopTestServer(server);
      }
    },
  },
  {
    name: 'GET /store/products/:id returns a product by id',
    async run() {
      const restoreFindUnique = stubMethod(prisma.product, 'findUnique', async () => ({
        id: 14,
        name: 'Anel Flor',
        description: 'Prata 925',
        price: '129.90',
        stock: 3,
        categoryId: 1,
        category: {
          id: 1,
          name: 'Aneis',
        },
        imageUrl: null,
      }));

      const { server, baseUrl } = await startTestServer();

      try {
        const response = await fetch(`${baseUrl}/store/products/14`);

        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), {
          id: 14,
          name: 'Anel Flor',
          description: 'Prata 925',
          price: '129.90',
          stock: 3,
          categoryId: 1,
          category: {
            id: 1,
            name: 'Aneis',
          },
          imageUrl: null,
        });
      } finally {
        restoreFindUnique();
        await stopTestServer(server);
      }
    },
  },
  // Login com Google desativado por enquanto.
  // Para reativar, restaure a rota POST /store/auth/google e este teste.
  // {
  //   name: 'POST /store/auth/google returns 400 when credential is missing',
  //   async run() {
  //     const { server, baseUrl } = await startTestServer();
  //
  //     try {
  //       const response = await fetch(`${baseUrl}/store/auth/google`, {
  //         method: 'POST',
  //         headers: {
  //           'Content-Type': 'application/json',
  //         },
  //         body: JSON.stringify({}),
  //       });
  //
  //       assert.equal(response.status, 400);
  //       assert.deepEqual(await response.json(), {
  //         error: 'Credencial do Google e obrigatoria.',
  //       });
  //     } finally {
  //       await stopTestServer(server);
  //     }
  //   },
  // },
  {
    name: 'POST /store/auth/register creates customer session with password',
    async run() {
      let createPayload = null;
      const restoreFindUnique = stubMethod(prisma.customer, 'findUnique', async () => null);
      const restoreCreate = stubMethod(prisma.customer, 'create', async ({ data }) => {
        createPayload = data;

        return {
          id: 22,
          ...data,
          avatarUrl: null,
        };
      });

      const { server, baseUrl } = await startTestServer();

      try {
        const response = await fetch(`${baseUrl}/store/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'Cliente Cadastro',
            email: 'CLIENTE@TESTE.COM',
            password: 'senha123',
            phone: '11999999999',
            marketingOptIn: true,
          }),
        });

        const body = await response.json();
        assert.equal(response.status, 201);
        assert.equal(typeof body.token, 'string');
        assert.equal(body.customer.email, 'cliente@teste.com');
        assert.equal(body.customer.leadSource, 'store_register');
        assert.equal(body.customer.marketingOptIn, true);
        assert.equal(createPayload.name, 'Cliente Cadastro');
        assert.equal(createPayload.email, 'cliente@teste.com');
        assert.notEqual(createPayload.password, 'senha123');
        assert.equal(createPayload.phone, '11999999999');
        assert.equal(createPayload.marketingOptIn, true);
      } finally {
        restoreFindUnique();
        restoreCreate();
        await stopTestServer(server);
      }
    },
  },
  {
    name: 'POST /store/orders denies checkout without customer token',
    async run() {
      const { server, baseUrl } = await startTestServer();

      try {
        const response = await fetch(`${baseUrl}/store/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            items: [{ productId: 1, quantity: 1 }],
          }),
        });

        assert.equal(response.status, 401);
        assert.deepEqual(await response.json(), {
          error: 'Entre para finalizar o pedido.',
        });
      } finally {
        await stopTestServer(server);
      }
    },
  },
  {
    name: 'POST /store/orders creates pending order without decrementing stock',
    async run() {
      let createdOrderPayload = null;
      let persistedGatewayPayload = null;
      let stockWasDecremented = false;
      const restoreCustomerFindUnique = stubMethod(prisma.customer, 'findUnique', async () => ({
        id: 22,
        name: 'Cliente Form',
        email: 'cliente@teste.com',
      }));
      const restoreCustomerUpdate = stubMethod(prisma.customer, 'update', async ({ data }) => ({
        id: 22,
        name: 'Cliente Form',
        email: 'cliente@teste.com',
        ...data,
      }));
      const restoreProductFindMany = stubMethod(prisma.product, 'findMany', async () => [
        {
          id: 5,
          name: 'Brinco Aurora',
          price: '89.90',
          stock: 7,
        },
      ]);
      const restoreProductUpdateMany = stubMethod(prisma.product, 'updateMany', async () => {
        stockWasDecremented = true;
        return { count: 1 };
      });
      const restoreOrderCreate = stubMethod(prisma.order, 'create', async ({ data }) => {
        createdOrderPayload = data;

        return {
          id: 31,
          status: 'PENDING',
          customerId: 22,
          total: data.total,
          customer: {
            id: 22,
            name: 'Cliente Form',
            email: 'cliente@teste.com',
          },
          items: [
            {
              id: 1,
              productId: 5,
              quantity: 2,
              price: '89.90',
              product: {
                id: 5,
                name: 'Brinco Aurora',
              },
            },
          ],
        };
      });
      const restoreOrderUpdate = stubMethod(prisma.order, 'update', async ({ data }) => {
        persistedGatewayPayload = data;

        return {
          id: 31,
          ...data,
        };
      });
      const restoreOrderEventCreate = stubMethod(prisma.orderEvent, 'create', async () => ({}));

      const { server, baseUrl } = await startTestServer();

      try {
        const response = await fetch(`${baseUrl}/store/orders`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${createToken({ sub: '22', email: 'cliente@teste.com', role: 'customer' })}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            items: [{ productId: 5, quantity: 2 }],
            paymentMethod: 'pix',
            customer: {
              cpf: '22644620783',
              phone: '11999999999',
            },
          }),
        });

        const body = await response.json();
        assert.equal(response.status, 201);
        assert.equal(body.order.id, 31);
        assert.equal(body.order.total, '170.81');
        assert.equal(body.payment.status, 'pending');
        assert.equal(typeof body.payment.pixCopyPaste, 'string');
        assert.equal(stockWasDecremented, false);
        assert.equal(createdOrderPayload.customerId, 22);
        assert.equal(createdOrderPayload.status, 'PENDING');
        assert.equal(createdOrderPayload.items.create[0].productId, 5);
        assert.equal(createdOrderPayload.items.create[0].quantity, 2);
        assert.equal(persistedGatewayPayload.gatewayProvider, 'local');
        assert.equal(persistedGatewayPayload.paymentMethod, 'pix');
      } finally {
        restoreCustomerFindUnique();
        restoreCustomerUpdate();
        restoreProductFindMany();
        restoreProductUpdateMany();
        restoreOrderCreate();
        restoreOrderUpdate();
        restoreOrderEventCreate();
        await stopTestServer(server);
      }
    },
  },
  {
    name: 'POST /store/orders/:id/complete-test-payment marks customer order as paid outside production',
    async run() {
      let updatedStatus = null;
      const restoreFindFirst = stubMethod(prisma.order, 'findFirst', async () => ({
        id: 31,
        customerId: 22,
        status: 'PENDING',
        items: [{ productId: 5, quantity: 2 }],
      }));
      const restoreTransaction = stubMethod(prisma, '$transaction', async (callback) =>
        callback({
          order: {
            findUnique: async () => ({
              id: 31,
              status: 'PENDING',
              customer: {
                id: 22,
                name: 'Cliente Form',
                email: 'cliente@teste.com',
              },
              items: [{ productId: 5, quantity: 2 }],
            }),
            update: async ({ data }) => {
              updatedStatus = data.status;

              return {
                id: 31,
                status: data.status,
                customer: {
                  id: 22,
                  name: 'Cliente Form',
                  email: 'cliente@teste.com',
                },
                items: [
                  {
                    id: 1,
                    productId: 5,
                    quantity: 2,
                    product: {
                      id: 5,
                      name: 'Brinco Aurora',
                    },
                  },
                ],
              };
            },
          },
          product: {
            updateMany: async () => ({ count: 1 }),
          },
        }),
      );

      const { server, baseUrl } = await startTestServer();

      try {
        const response = await fetch(`${baseUrl}/store/orders/31/complete-test-payment`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${createToken({ sub: '22', email: 'cliente@teste.com', role: 'customer' })}`,
          },
        });

        assert.equal(response.status, 200);
        const body = await response.json();
        assert.equal(updatedStatus, 'PAID');
        assert.equal(body.status, 'PAID');
      } finally {
        restoreFindFirst();
        restoreTransaction();
        await stopTestServer(server);
      }
    },
  },
  {
    name: 'POST /webhook/stripe marks paid order and decrements stock',
    async run() {
      let updatedOrderStatus = null;
      let decrementedStock = null;
      const restoreFindUnique = stubMethod(prisma.order, 'findUnique', async () => ({
        id: 31,
        status: 'PENDING',
        total: '170.81',
        customer: {
          name: 'Cliente Form',
          email: 'cliente@teste.com',
        },
        items: [
          {
            productId: 5,
            quantity: 2,
            product: {
              id: 5,
              name: 'Brinco Aurora',
            },
          },
        ],
      }));
      const restoreTransaction = stubMethod(prisma, '$transaction', async (callback) =>
        callback({
          order: {
            findUnique: async () => ({
              id: 31,
              status: 'PENDING',
              total: '170.81',
              customer: {
                name: 'Cliente Form',
                email: 'cliente@teste.com',
              },
              items: [
                {
                  productId: 5,
                  quantity: 2,
                },
              ],
            }),
            update: async ({ data }) => {
              updatedOrderStatus = data.status;

              return {
                id: 31,
                status: data.status,
                total: '170.81',
                customer: {
                  name: 'Cliente Form',
                  email: 'cliente@teste.com',
                },
                items: [
                  {
                    productId: 5,
                    quantity: 2,
                  },
                ],
              };
            },
          },
          product: {
            updateMany: async ({ data }) => {
              decrementedStock = data.stock.decrement;
              return { count: 1 };
            },
          },
        }),
      );

      const { server, baseUrl } = await startTestServer();

      try {
        const response = await fetch(`${baseUrl}/webhook/stripe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'payment_intent.succeeded',
            data: {
              object: {
                id: 'pi_test_31',
                metadata: {
                  order_id: '31',
                },
              },
            },
          }),
        });

        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), { received: true });
        assert.equal(updatedOrderStatus, 'PAID');
        assert.equal(decrementedStock, 2);
      } finally {
        restoreFindUnique();
        restoreTransaction();
        await stopTestServer(server);
      }
    },
  },
  {
    name: 'POST /webhook/stripe keeps order pending on failed card payment',
    async run() {
      let updatedOrderStatus = null;
      const restoreFindUnique = stubMethod(prisma.order, 'findUnique', async () => ({
        id: 32,
        status: 'PENDING',
        total: '99.90',
        customer: {
          name: 'Cliente Form',
          email: 'cliente@teste.com',
        },
        items: [
          {
            productId: 6,
            quantity: 1,
          },
        ],
      }));
      const restoreUpdate = stubMethod(prisma.order, 'update', async ({ data }) => {
        updatedOrderStatus = data.status;

        return {
          id: 32,
          status: data.status,
        };
      });

      const { server, baseUrl } = await startTestServer();

      try {
        const response = await fetch(`${baseUrl}/webhook/stripe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'payment_intent.payment_failed',
            data: {
              object: {
                id: 'pi_test_32',
                metadata: {
                  order_id: '32',
                },
              },
            },
          }),
        });

        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), { received: true });
        assert.equal(updatedOrderStatus, 'PENDING');
      } finally {
        restoreFindUnique();
        restoreUpdate();
        await stopTestServer(server);
      }
    },
  },
  {
    name: 'POST /webhook/stripe marks paid order for stock review when stock is insufficient',
    async run() {
      const restoreFindUnique = stubMethod(prisma.order, 'findUnique', async () => ({
        id: 33,
        status: 'PENDING',
        total: '199.90',
        customer: {
          name: 'Cliente Form',
          email: 'cliente@teste.com',
        },
        items: [
          {
            productId: 7,
            quantity: 3,
          },
        ],
      }));
      const restoreTransaction = stubMethod(prisma, '$transaction', async (callback) =>
        callback({
          order: {
            findUnique: async () => ({
              id: 33,
              status: 'PENDING',
              total: '199.90',
              customer: {
                name: 'Cliente Form',
                email: 'cliente@teste.com',
              },
              items: [
                {
                  productId: 7,
                  quantity: 3,
                },
              ],
            }),
            update: async ({ data }) => ({
              id: 33,
              status: data.status,
              total: '199.90',
              customer: {
                name: 'Cliente Form',
                email: 'cliente@teste.com',
              },
              items: [
                {
                  productId: 7,
                  quantity: 3,
                  product: {
                    name: 'Produto',
                  },
                },
              ],
            }),
          },
          product: {
            updateMany: async () => ({ count: 0 }),
          },
          orderEvent: {
            create: async () => ({}),
          },
        }),
      );

      const { server, baseUrl } = await startTestServer();

      try {
        const response = await fetch(`${baseUrl}/webhook/stripe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'payment_intent.succeeded',
            data: {
              object: {
                id: 'pi_test_33',
                metadata: {
                  order_id: '33',
                },
              },
            },
          }),
        });

        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), { received: true });
      } finally {
        restoreFindUnique();
        restoreTransaction();
        await stopTestServer(server);
      }
    },
  },
  {
    name: 'POST /admin/products returns 400 when category is invalid',
    async run() {
      const restoreFindUnique = stubMethod(prisma.category, 'findUnique', async () => null);

      const { server, baseUrl } = await startTestServer();

      try {
        const response = await fetch(`${baseUrl}/admin/products`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${createToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'Produto sem categoria valida',
            description: 'Teste',
            price: '19.90',
            stock: 2,
            categoryId: 999,
          }),
        });

        assert.equal(response.status, 400);
        assert.deepEqual(await response.json(), {
          error: 'Categoria invalida.',
        });
      } finally {
        restoreFindUnique();
        await stopTestServer(server);
      }
    },
  },
  {
    name: 'POST /admin/products creates product from multipart form-data with image upload',
    async run() {
      let createPayload = null;
      const restoreCategoryFindUnique = stubMethod(prisma.category, 'findUnique', async () => ({
        id: 3,
        name: 'Colares',
      }));

      const restoreCreate = stubMethod(prisma.product, 'create', async ({ data }) => {
        createPayload = data;

        return {
          id: 15,
          ...data,
        };
      });

      const { server, baseUrl } = await startTestServer();

      try {
        const formData = new FormData();
        formData.append('name', 'Anel Sol');
        formData.append('description', 'Anel com acabamento polido');
        formData.append('price', '199.90');
        formData.append('stock', '5');
        formData.append('categoryId', '3');
        const pngBytes = Uint8Array.from(
          Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
            'base64',
          ),
        );
        formData.append('image', new Blob([pngBytes], { type: 'image/png' }), 'anel-sol.png');

        const response = await fetch(`${baseUrl}/admin/products`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${createToken()}`,
          },
          body: formData,
        });

        assert.equal(response.status, 201);

        const body = await response.json();
        assert.equal(body.id, 15);
        assert.equal(createPayload.name, 'Anel Sol');
        assert.equal(createPayload.stock, 5);
        assert.equal(createPayload.categoryId, 3);
        assert.match(createPayload.imageUrl, /\/uploads\/.+\.webp$/);

        await removeUploadedFileFromUrl(createPayload.imageUrl);
      } finally {
        restoreCategoryFindUnique();
        restoreCreate();
        await stopTestServer(server);
      }
    },
  },
  {
    name: 'PUT /admin/products/:id returns 404 when the product does not exist',
    async run() {
      const restoreCategoryFindUnique = stubMethod(prisma.category, 'findUnique', async () => ({
        id: 1,
        name: 'Categoria',
      }));
      const restoreFindUnique = stubMethod(prisma.product, 'findUnique', async () => null);

      const { server, baseUrl } = await startTestServer();

      try {
        const response = await fetch(`${baseUrl}/admin/products/999`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${createToken()}`,
          },
          body: JSON.stringify({
            name: 'Produto inexistente',
            description: 'Teste',
            price: '10.00',
            stock: 1,
            categoryId: 1,
          }),
        });

        assert.equal(response.status, 404);
        assert.deepEqual(await response.json(), {
          error: 'Produto nao encontrado.',
        });
      } finally {
        restoreCategoryFindUnique();
        restoreFindUnique();
        await stopTestServer(server);
      }
    },
  },
  {
    name: 'DELETE /admin/products/:id removes an existing product',
    async run() {
      const restoreFindUnique = stubMethod(prisma.product, 'findUnique', async () => ({
        id: 12,
        name: 'Pulseira',
      }));
      const restoreCount = stubMethod(prisma.orderItem, 'count', async () => 0);
      const restoreDelete = stubMethod(prisma.product, 'delete', async () => ({
        id: 12,
      }));

      const { server, baseUrl } = await startTestServer();

      try {
        const response = await fetch(`${baseUrl}/admin/products/12`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${createToken()}`,
          },
        });

        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), {
          message: 'Produto eliminado com sucesso.',
        });
      } finally {
        restoreFindUnique();
        restoreCount();
        restoreDelete();
        await stopTestServer(server);
      }
    },
  },
  {
    name: 'DELETE /admin/products/:id rejects deletion when product has linked orders',
    async run() {
      const restoreFindUnique = stubMethod(prisma.product, 'findUnique', async () => ({
        id: 18,
        name: 'Produto vendido',
      }));
      const restoreCount = stubMethod(prisma.orderItem, 'count', async () => 2);

      const { server, baseUrl } = await startTestServer();

      try {
        const response = await fetch(`${baseUrl}/admin/products/18`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${createToken()}`,
          },
        });

        assert.equal(response.status, 409);
        assert.deepEqual(await response.json(), {
          error:
            'Nao e possivel excluir este produto porque ele ja esta vinculado a pedidos. Para manter o historico de vendas, ajuste o estoque para 0 ou edite o produto em vez de excluir.',
        });
      } finally {
        restoreFindUnique();
        restoreCount();
        await stopTestServer(server);
      }
    },
  },
  {
    name: 'POST /admin/upload-image rejects non-image files',
    async run() {
      const { server, baseUrl } = await startTestServer();

      try {
        const formData = new FormData();
        formData.append('image', new Blob(['plain-text'], { type: 'text/plain' }), 'arquivo.txt');

        const response = await fetch(`${baseUrl}/admin/upload-image`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${createToken()}`,
          },
          body: formData,
        });

        assert.equal(response.status, 400);
        assert.deepEqual(await response.json(), {
          error: 'Envie uma imagem JPG, PNG ou WebP.',
        });
      } finally {
        await stopTestServer(server);
      }
    },
  },
];
