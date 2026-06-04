const { test, expect } = require('@playwright/test');

const STORE_URL = 'http://127.0.0.1:5600';

const categories = [
  { id: 1, name: 'Aneis', imageUrl: '' },
  { id: 2, name: 'Colares', imageUrl: '' },
];

const products = [
  {
    id: 101,
    name: 'Anel Aurora',
    description: 'Anel delicado com banho dourado.',
    price: 199.9,
    stock: 4,
    categoryId: 1,
    imageUrl: '',
    category: { id: 1, name: 'Aneis' },
  },
  {
    id: 102,
    name: 'Colar Luna',
    description: 'Colar minimalista para uso diario.',
    price: 149.9,
    stock: 2,
    categoryId: 2,
    imageUrl: '',
    category: { id: 2, name: 'Colares' },
  },
];

const customer = {
  id: 77,
  name: 'Cliente Teste',
  email: 'cliente@teste.com',
  phone: '11999999999',
};

const pendingOrder = {
  id: 9001,
  status: 'PENDING',
  total: '208.81',
  customer,
  items: [
    {
      id: 1,
      productId: 101,
      quantity: 1,
      price: '199.90',
      product: {
        id: 101,
        name: 'Anel Aurora',
      },
    },
  ],
};

const paidOrder = {
  ...pendingOrder,
  status: 'PAID',
};

const pixPayment = {
  provider: 'local',
  status: 'pending',
  paymentMethod: 'pix',
  qrCode:
    '00020126580014BR.GOV.BCB.PIX0136teste-pix-thessara@example.com5204000053039865406208.815802BR5910THESSARA6009SAO PAULO62070503***6304ABCD',
  pixCopyPaste:
    '00020126580014BR.GOV.BCB.PIX0136teste-pix-thessara@example.com5204000053039865406208.815802BR5910THESSARA6009SAO PAULO62070503***6304ABCD',
};

test.describe('Loja publica', () => {
  test.beforeEach(async ({ page }) => {
    await mockStoreApi(page);
  });

  test('navega por produtos e adiciona item ao carrinho', async ({ page }) => {
    await page.goto(STORE_URL);

    const header = page.getByRole('banner');
    await expect(header.getByRole('link', { name: 'Produtos' })).toBeVisible();
    await header.getByRole('link', { name: 'Produtos' }).click();

    await expect(page).toHaveURL(/\/produtos$/);
    await expect(page.getByText('Anel Aurora').first()).toBeVisible();

    await page.getByRole('link', { name: 'Anel Aurora' }).first().click();
    await expect(page.getByRole('heading', { name: 'Anel Aurora' })).toBeVisible();

    await page.getByRole('button', { name: /Adicionar ao carrinho/ }).click();
    await expect(page.getByText('Produto adicionado ao carrinho.')).toBeVisible();

    await header.getByRole('link', { name: /Carrinho/ }).click();
    await expect(page).toHaveURL(/\/carrinho$/);
    await expect(page.getByText('Itens da compra')).toBeVisible();
    const cartItem = page.getByRole('article').filter({ hasText: 'Anel Aurora' });
    await expect(cartItem).toBeVisible();
    await expect(cartItem.getByText(/Valor unit.rio/)).toBeVisible();
    await expect(page.getByRole('complementary').getByText('Itens')).toBeVisible();
    await expect(page.getByRole('complementary').getByText('R$ 199,90').first()).toBeVisible();
  });

  test('mantem tema claro padrao', async ({ page }) => {
    await page.goto(STORE_URL);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('cadastra cliente pela loja e redireciona para o checkout', async ({ page }) => {
    await page.goto(STORE_URL);
    await addProductToCart(page);

    await page
      .getByRole('banner')
      .getByRole('link', { name: /Carrinho/ })
      .click();
    await page.getByRole('link', { name: 'Entrar para pagar' }).click();

    await expect(page).toHaveURL(/\/entrar$/);
    await fillLeadAuthForm(page);

    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.getByRole('heading', { name: 'Seus dados' })).toBeVisible();
  });

  test('finaliza checkout PIX, exibe codigo e confirma pagamento por polling', async ({ page }) => {
    let orderPayload = null;
    let orderFetchCount = 0;

    await page.route(`${STORE_URL}/store/orders`, async (route) => {
      orderPayload = JSON.parse(route.request().postData() || '{}');

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          order: pendingOrder,
          payment: pixPayment,
        }),
      });
    });

    await page.route(`${STORE_URL}/store/orders/${pendingOrder.id}/payment`, async (route) => {
      const resolvedOrder = orderFetchCount >= 1 ? paidOrder : pendingOrder;
      orderFetchCount += 1;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          orderId: resolvedOrder.id,
          paymentStatus: resolvedOrder.status,
          orderStatus: resolvedOrder.status,
          paymentMethod: 'pix',
          amount: Number(resolvedOrder.total || 0),
          order: resolvedOrder,
          pix: {
            qrCode: pixPayment.qrCode,
            copyPaste: pixPayment.pixCopyPaste,
          },
        }),
      });
    });

    await page.goto(STORE_URL);
    await addProductToCart(page);
    await page
      .getByRole('banner')
      .getByRole('link', { name: /Carrinho/ })
      .click();
    await page.getByRole('link', { name: 'Entrar para pagar' }).click();
    await loginCustomer(page);

    await expect(page).toHaveURL(/\/checkout$/);
    await fillCheckoutForm(page);
    await page.getByRole('button', { name: 'Gerar pedido e pagar' }).first().click();

    await expect(page).toHaveURL(/\/checkout\/pagamento\/9001$/);
    await expect(page.getByText('Finalize seu pagamento')).toBeVisible();
    await expect(page.getByText('PIX Cópia e Cola')).toBeVisible();
    await expect(page.locator('textarea').filter({ hasText: 'BR.GOV.BCB.PIX' })).toBeVisible();
    await expect.poll(() => orderFetchCount, { timeout: 5000 }).toBeGreaterThan(0);
    await expect(
      page.getByText('Pagamento confirmado').first(),
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Pagamento aprovado')).toBeVisible();
    expect(orderPayload.paymentMethod).toBe('pix');
    expect(orderPayload.items).toEqual([{ productId: 101, quantity: 1, variantId: null }]);
  });
});

async function mockStoreApi(page) {
  await page.route(`${STORE_URL}/store/categories`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(categories),
    });
  });

  await page.route(
    new RegExp(`${STORE_URL.replace(/\./g, '\\.')}/store/products/\\d+$`),
    async (route) => {
      const productId = Number(route.request().url().split('/').pop());
      const product = products.find((item) => item.id === productId);

      await route.fulfill({
        status: product ? 200 : 404,
        contentType: 'application/json',
        body: JSON.stringify(product || { error: 'Produto nao encontrado.' }),
      });
    },
  );

  await page.route(
    new RegExp(`${STORE_URL.replace(/\./g, '\\.')}/store/products(?:\\?.*)?$`),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(products),
      });
    },
  );

  await page.route(`${STORE_URL}/store/auth/register`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'customer-browser-token',
        customer,
      }),
    });
  });

  await page.route(`${STORE_URL}/store/auth/login`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'customer-browser-token',
        customer,
      }),
    });
  });

  await page.route('https://viacep.com.br/ws/01001000/json/', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        cep: '01001-000',
        logradouro: 'Praca da Se',
        bairro: 'Se',
        localidade: 'Sao Paulo',
        uf: 'SP',
      }),
    });
  });

  await page.route(`${STORE_URL}/store/shipping/calculate`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          { id: 1, name: 'PAC', price: 8.91, deadline: 7 },
          { id: 2, name: 'SEDEX', price: 18.72, deadline: 2 },
        ],
      }),
    });
  });

  await page.route(`${STORE_URL}/store/me`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      }),
    });
  });
}

async function addProductToCart(page) {
  const header = page.getByRole('banner');

  await header.getByRole('link', { name: 'Produtos' }).click();
  await page.getByRole('link', { name: 'Anel Aurora' }).first().click();
  await page.getByRole('button', { name: /Adicionar ao carrinho/ }).click();
  await expect(page.getByText('Produto adicionado ao carrinho.')).toBeVisible();
}

async function loginCustomer(page) {
  await fillLeadAuthForm(page);
}

async function fillLeadAuthForm(page) {
  await page.getByRole('button', { name: 'Criar conta' }).first().click();
  await page.locator('#register-name').fill(customer.name);
  await page.locator('#register-email').fill(customer.email);
  await page.locator('#register-password').fill('Teste@123');
  await page.locator('#register-phone').fill(customer.phone);
  await page.getByRole('button', { name: /Criar conta/ }).last().click();
}

async function fillCheckoutForm(page) {
  await page.getByLabel('CPF').fill('123.456.789-09');
  await page.getByRole('button', { name: /Continuar para endereço/ }).first().click();

  await page.getByLabel('CEP').fill('01001-000');
  await page.getByLabel('CEP').blur();
  await expect(page.getByText(/Endereço preenchido pelo CEP/)).toBeVisible();
  await page.getByLabel('Numero').fill('100');
  await page.getByRole('button', { name: /Continuar para observações/ }).first().click();

  await page.locator('#orderNotes').fill('Teste automatizado do fluxo PIX.');
  await page.getByRole('button', { name: /Continuar para pagamento/ }).first().click();
}
