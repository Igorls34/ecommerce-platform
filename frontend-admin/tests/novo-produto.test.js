const assert = require('node:assert/strict');
const {
  FakeDocument,
  FakeElement,
  createLocalStorage,
  createLocation,
  loadScript,
} = require('./helpers/browserHarness');

module.exports = [
  {
    name: 'new product page denies access without token',
    async run() {
      const document = new FakeDocument();
      const alerts = [];
      const location = createLocation('http://localhost:5500/pages/novo-produto.html');

      loadScript('novo-produto.js', {
        document,
        location,
        localStorage: createLocalStorage(),
        alert: (message) => alerts.push(message),
      });

      await document.dispatchEvent('DOMContentLoaded');

      assert.equal(alerts[0], 'Acesso negado');
      assert.equal(location.href, 'index.html');
    },
  },
  {
    name: 'new product page sends multipart request and redirects on success',
    async run() {
      const document = new FakeDocument();
      const form = document.registerElement('productForm', new FakeElement('form'));
      document.registerElement('logoutButton', new FakeElement('button'));
      document.registerElement('submitButton', new FakeElement('button')).textContent =
        'Salvar Produto';
      document.registerElement('name').value = 'Anel';
      document.registerElement('description').value = 'Descricao do anel';
      document.registerElement('price').value = '199.90';
      document.registerElement('stock').value = '7';
      document.registerElement('categoryId').value = '2';
      document.registerElement('image').files = [new Blob(['img'], { type: 'image/png' })];

      const location = createLocation('http://localhost:5500/pages/novo-produto.html');
      const localStorage = createLocalStorage({ adminToken: 'jwt-ok' });
      const alerts = [];
      let request = null;

      loadScript('novo-produto.js', {
        document,
        location,
        localStorage,
        alert: (message) => alerts.push(message),
        fetch: async (url, init) => {
          request = { url, init };
          return {
            ok: true,
            json: async () => ({ id: 1 }),
          };
        },
      });

      await document.dispatchEvent('DOMContentLoaded');
      await form.dispatchEvent('submit', { preventDefault() {} });

      assert.equal(request.url, 'http://localhost:3333/admin/products');
      assert.equal(request.init.method, 'POST');
      assert.equal(request.init.headers.Authorization, 'Bearer jwt-ok');
      assert.equal(request.init.body instanceof FormData, true);
      assert.equal(alerts[0], 'Produto criado com sucesso!');
      assert.equal(location.href, 'produtos.html');
    },
  },
];
