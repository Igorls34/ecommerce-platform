const { test, expect } = require('@playwright/test');

test.describe('Painel Admin React', () => {
  test('faz login e redireciona para o dashboard', async ({ page }) => {
    await page.route('http://127.0.0.1:5500/admin/login', async (route) => {
      const request = route.request();
      expect(request.method()).toBe('POST');

      const payload = JSON.parse(request.postData() || '{}');
      expect(payload.email).toBe('admin@eliane.com');
      expect(payload.password).toBe('admin123');

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'jwt-browser-test',
          admin: {
            id: 1,
            name: 'Administrador',
            email: 'admin@eliane.com',
          },
        }),
      });
    });

    await page.route('http://127.0.0.1:5500/admin/products', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('http://127.0.0.1:5500/admin/categories', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 1, name: 'Aneis' }]),
      });
    });

    await page.route('http://127.0.0.1:5500/admin/orders', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('http://127.0.0.1:5500/admin/customers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/');
    await page.getByLabel('E-mail').fill('admin@eliane.com');
    await page.getByLabel('Senha').fill('admin123');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('renderiza a lista de produtos no browser', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('adminToken', 'jwt-browser-test');
    });

    await page.route('http://127.0.0.1:5500/admin/products', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, name: 'Anel Aurora', price: 199.9, stock: 3, categoryId: 1 },
          { id: 2, name: 'Brinco Sol', price: 89.5, stock: 7, categoryId: 2 },
        ]),
      });
    });

    await page.route('http://127.0.0.1:5500/admin/categories', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, name: 'Aneis' },
          { id: 2, name: 'Brincos' },
        ]),
      });
    });

    await page.goto('/produtos');

    await expect(page.getByRole('heading', { name: 'Produtos', exact: true })).toBeVisible();
    await expect(page.getByText('Anel Aurora')).toBeVisible();
    await expect(page.getByText('Brinco Sol')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Excluir' }).first()).toBeVisible();
  });

  test('envia cadastro de produto com upload e redireciona', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('adminToken', 'jwt-browser-test');
    });

    let uploadAuthorization = null;
    let createAuthorization = null;
    let createRequestBody = '';

    await page.route('http://127.0.0.1:5500/admin/upload-image', async (route) => {
      uploadAuthorization = route.request().headers().authorization;

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          imageUrl: 'http://127.0.0.1:5500/uploads/colar-luna.png',
          provider: 'local',
        }),
      });
    });

    await page.route('http://127.0.0.1:5500/admin/products', async (route) => {
      const request = route.request();
      if (request.method() !== 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
        return;
      }

      createAuthorization = request.headers().authorization;
      createRequestBody = request.postData() || request.postDataBuffer()?.toString('utf8') || '';

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 99,
          name: 'Colar Luna',
        }),
      });
    });

    await page.route('http://127.0.0.1:5500/admin/categories', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 1, name: 'Colares' }]),
      });
    });

    await page.goto('/produtos/novo');
    await page.getByLabel('Nome').fill('Colar Luna');
    await page.locator('#description').fill('Colar com banho dourado');
    await page.locator('#price').fill('149.90');
    await page.getByLabel('Estoque').fill('6');
    await page.getByLabel('Categoria').selectOption('1');
    await page.getByLabel('Imagem').setInputFiles({
      name: 'colar.png',
      mimeType: 'image/png',
      buffer: Buffer.from('fake-image'),
    });

    await page.getByRole('button', { name: 'Salvar Produto' }).click();

    await expect(page).toHaveURL(/\/produtos$/);
    expect(uploadAuthorization).toBe('Bearer jwt-browser-test');
    expect(createAuthorization).toBe('Bearer jwt-browser-test');
    expect(createRequestBody).toContain('Colar Luna');
    expect(createRequestBody).toContain('Colar com banho dourado');
    expect(createRequestBody).toContain('http://127.0.0.1:5500/uploads/colar-luna.png');
  });
});
