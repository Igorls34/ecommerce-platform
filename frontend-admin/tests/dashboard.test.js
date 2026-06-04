const assert = require('node:assert/strict');
const { FakeDocument, loadScript } = require('./helpers/browserHarness');

module.exports = [
  {
    name: 'dashboard summary renders totals and inventory value',
    async run() {
      const document = new FakeDocument();
      document.registerElement('totalProducts');
      document.registerElement('totalStock');
      document.registerElement('lowStockCount');
      document.registerElement('inventoryValue');

      const { context } = loadScript('dashboard.js', { document });

      context.renderDashboardSummary([
        { id: 1, stock: 2, price: 10 },
        { id: 2, stock: 8, price: 5.5 },
      ]);

      assert.equal(document.getElementById('totalProducts').textContent, '2');
      assert.equal(document.getElementById('totalStock').textContent, '10');
      assert.equal(document.getElementById('lowStockCount').textContent, '1');
      assert.match(document.getElementById('inventoryValue').textContent, /R\$/);
    },
  },
];
