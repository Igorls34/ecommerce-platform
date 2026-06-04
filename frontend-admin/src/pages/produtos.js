document.addEventListener('DOMContentLoaded', async () => {
  const token = requireAdminAuth();
  const tableBody = document.getElementById('productsTableBody');
  const logoutButton = document.getElementById('logoutButton');

  if (!token || !tableBody) {
    return;
  }

  if (logoutButton) {
    logoutButton.addEventListener('click', logoutAdmin);
  }

  await renderProductsTable();
});

async function renderProductsTable() {
  const tableBody = document.getElementById('productsTableBody');

  if (!tableBody) {
    return;
  }

  const products = await getProducts();

  tableBody.innerHTML = '';

  if (!Array.isArray(products) || products.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="table-message">Nao ha produtos cadastrados.</td>
      </tr>
    `;
    return;
  }

  products.forEach((product) => {
    const row = document.createElement('tr');
    const formattedPrice = Number(product.price).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

    row.innerHTML = `
      <td>#${product.id}</td>
      <td>${product.name}</td>
      <td>${formattedPrice}</td>
      <td>${product.stock}</td>
      <td>
        <div class="actions">
          <button type="button" class="button button-secondary action-button" data-action="edit" data-id="${product.id}">
            Editar
          </button>
          <button type="button" class="button button-danger action-button" data-action="delete" data-id="${product.id}" data-name="${product.name}">
            Excluir
          </button>
        </div>
      </td>
    `;

    tableBody.appendChild(row);
  });

  bindProductActions();
}

function bindProductActions() {
  const editButtons = document.querySelectorAll('[data-action="edit"]');
  const deleteButtons = document.querySelectorAll('[data-action="delete"]');

  editButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const { id } = button.dataset;
      window.location.href = `produto-form.html?id=${id}`;
    });
  });

  deleteButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      const { id, name } = button.dataset;
      const confirmed = await showLegacyAdminConfirm(`Deseja excluir o produto "${name}"?`);

      if (!confirmed) {
        return;
      }

      const success = await deleteProduct(id);

      if (success) {
        await showLegacyAdminNotice('Produto excluido com sucesso.');
        await renderProductsTable();
      }
    });
  });
}

function showLegacyAdminConfirm(message) {
  return showLegacyAdminDialog({
    message,
    confirmLabel: 'Excluir',
    cancelLabel: 'Cancelar',
    danger: true,
  });
}

function showLegacyAdminNotice(message) {
  return showLegacyAdminDialog({
    message,
    confirmLabel: 'Ok',
  });
}

function showLegacyAdminDialog({ message, confirmLabel, cancelLabel = '', danger = false }) {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    const text = document.createElement('p');
    const actions = document.createElement('div');
    const confirmButton = document.createElement('button');

    dialog.className = 'admin-confirm-modal';
    actions.className = 'admin-confirm-actions';
    text.textContent = message;
    confirmButton.type = 'button';
    confirmButton.className = danger ? 'button button-danger' : 'button button-primary';
    confirmButton.textContent = confirmLabel;

    if (cancelLabel) {
      const cancelButton = document.createElement('button');
      cancelButton.type = 'button';
      cancelButton.className = 'button button-secondary';
      cancelButton.textContent = cancelLabel;
      cancelButton.addEventListener('click', () => close(false));
      actions.appendChild(cancelButton);
    }

    confirmButton.addEventListener('click', () => close(true));
    actions.appendChild(confirmButton);
    dialog.append(text, actions);
    document.body.appendChild(dialog);
    dialog.showModal();

    function close(result) {
      dialog.close();
      dialog.remove();
      resolve(result);
    }
  });
}
