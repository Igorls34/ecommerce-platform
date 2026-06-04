document.addEventListener('DOMContentLoaded', async () => {
  const token = requireAdminAuth();
  const logoutButton = document.getElementById('logoutButton');

  if (!token) {
    return;
  }

  if (logoutButton) {
    logoutButton.addEventListener('click', logoutAdmin);
  }

  const products = await getProducts();
  renderDashboardSummary(products);
  renderRecentProducts(products);
});

function renderDashboardSummary(products) {
  const totalProductsElement = document.getElementById('totalProducts');
  const totalStockElement = document.getElementById('totalStock');
  const lowStockCountElement = document.getElementById('lowStockCount');
  const inventoryValueElement = document.getElementById('inventoryValue');

  const totalProducts = products.length;
  const totalStock = products.reduce((sum, product) => sum + Number(product.stock || 0), 0);
  const lowStockCount = products.filter((product) => Number(product.stock || 0) <= 3).length;
  const inventoryValue = products.reduce((sum, product) => {
    return sum + Number(product.price || 0) * Number(product.stock || 0);
  }, 0);

  totalProductsElement.textContent = String(totalProducts);
  totalStockElement.textContent = String(totalStock);
  lowStockCountElement.textContent = String(lowStockCount);
  inventoryValueElement.textContent = inventoryValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function renderRecentProducts(products) {
  const tableBody = document.getElementById('recentProductsTableBody');

  if (!tableBody) {
    return;
  }

  tableBody.innerHTML = '';

  if (!products.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="4" class="table-message">Nenhum produto cadastrado ainda.</td>
      </tr>
    `;
    return;
  }

  const recentProducts = [...products]
    .sort((first, second) => Number(second.id) - Number(first.id))
    .slice(0, 5);

  recentProducts.forEach((product) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>#${product.id}</td>
      <td>${product.name}</td>
      <td>${Number(product.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
      <td>${product.stock}</td>
    `;
    tableBody.appendChild(row);
  });
}
