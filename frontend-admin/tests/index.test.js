const assert = require('node:assert/strict');
const {
  FakeDocument,
  createLocalStorage,
  createLocation,
  loadScript,
} = require('./helpers/browserHarness');

module.exports = [
  {
    name: 'login redirects to dashboard when token already exists',
    async run() {
      const document = new FakeDocument();
      document.registerElement('loginForm');
      const location = createLocation('http://localhost:5500/pages/index.html');

      loadScript('index.js', {
        document,
        location,
        localStorage: createLocalStorage({ adminToken: 'token-valido' }),
      });

      await document.dispatchEvent('DOMContentLoaded');
      assert.equal(location.href, 'dashboard.html');
    },
  },
  {
    name: 'login stores token and redirects after successful authentication',
    async run() {
      const document = new FakeDocument();
      const form = document.registerElement('loginForm');
      document.registerElement('email').value = 'admin@eliane.com';
      document.registerElement('password').value = 'admin123';
      const location = createLocation('http://localhost:5500/pages/index.html');
      const localStorage = createLocalStorage();

      loadScript('index.js', {
        document,
        location,
        localStorage,
        fetch: async () => ({
          ok: true,
          json: async () => ({ token: 'jwt-novo' }),
        }),
      });

      await document.dispatchEvent('DOMContentLoaded');
      await form.dispatchEvent('submit', { preventDefault() {} });

      assert.equal(localStorage.getItem('adminToken'), 'jwt-novo');
      assert.equal(location.href, 'dashboard.html');
    },
  },
];
