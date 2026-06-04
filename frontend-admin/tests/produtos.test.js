const assert = require('node:assert/strict');
const { FakeDocument, loadScript } = require('./helpers/browserHarness');

module.exports = [
  {
    name: 'products page renders empty state when no products exist',
    async run() {
      const document = new FakeDocument();
      document.registerElement('productsTableBody');

      const { context } = loadScript('produtos.js', {
        document,
        getProducts: async () => [],
      });

      await context.renderProductsTable();

      assert.match(
        document.getElementById('productsTableBody').innerHTML,
        /Nao ha produtos cadastrados/,
      );
    },
  },
  {
    name: 'products page binds delete action and reloads table after confirmation',
    async run() {
      const document = new FakeDocument();
      const tableBody = document.registerElement('productsTableBody');
      const alerts = [];
      let deleteCalls = 0;

      const { context } = loadScript('produtos.js', {
        document,
        alert: (message) => alerts.push(message),
        getProducts: async () => [{ id: 5, name: 'Brinco', price: 99.9, stock: 4 }],
        deleteProduct: async () => {
          deleteCalls += 1;
          return true;
        },
      });

      await context.renderProductsTable();
      const deleteButton = document.querySelectorAll('[data-action="delete"]')[0];
      await deleteButton.dispatchEvent('click');

      assert.equal(deleteCalls, 1);
      assert.equal(alerts[0], 'Produto excluido com sucesso.');
      assert.equal(tableBody.children.length >= 1, true);
    },
  },
];
