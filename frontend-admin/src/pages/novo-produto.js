document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('adminToken');

  if (!token) {
    showLegacyAdminNotice('Acesso negado').then(() => {
      window.location.href = 'index.html';
    });
    return;
  }

  const logoutButton = document.getElementById('logoutButton');
  const productForm = document.getElementById('productForm');
  const submitButton = document.getElementById('submitButton');

  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      localStorage.removeItem('adminToken');
      window.location.href = 'index.html';
    });
  }

  if (!productForm || !submitButton) {
    return;
  }

  productForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const originalButtonText = submitButton.textContent;
    submitButton.textContent = 'Salvando...';
    submitButton.disabled = true;

    const formData = new FormData();
    formData.append('name', document.getElementById('name').value.trim());
    formData.append('description', document.getElementById('description').value.trim());
    formData.append('price', document.getElementById('price').value);
    formData.append('stock', document.getElementById('stock').value);
    formData.append('categoryId', document.getElementById('categoryId').value);
    formData.append('image', document.getElementById('image').files[0]);

    try {
      const response = await fetch('http://localhost:3333/admin/products', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        let message = 'Erro ao criar produto.';

        try {
          const errorData = await response.json();
          message = errorData.message || errorData.error || message;
        } catch {
          message = 'Erro ao criar produto.';
        }

        throw new Error(message);
      }

      await showLegacyAdminNotice('Produto criado com sucesso!');
      window.location.href = 'produtos.html';
    } catch (error) {
      showLegacyAdminNotice(error.message || 'Erro ao criar produto.');
    } finally {
      submitButton.textContent = originalButtonText;
      submitButton.disabled = false;
    }
  });
});

function showLegacyAdminNotice(message) {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    const text = document.createElement('p');
    const button = document.createElement('button');

    dialog.className = 'admin-confirm-modal';
    text.textContent = message;
    button.type = 'button';
    button.className = 'button button-primary';
    button.textContent = 'Ok';

    dialog.append(text, button);
    document.body.appendChild(dialog);
    button.addEventListener('click', () => {
      dialog.close();
      dialog.remove();
      resolve();
    });
    dialog.showModal();
  });
}
