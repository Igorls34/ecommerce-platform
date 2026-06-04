document.addEventListener('DOMContentLoaded', async () => {
  const token = requireAdminAuth();
  const logoutButton = document.getElementById('logoutButton');
  const productForm = document.getElementById('productForm');
  const imageFileInput = document.getElementById('imageFile');

  if (!token) {
    return;
  }

  if (logoutButton) {
    logoutButton.addEventListener('click', logoutAdmin);
  }

  if (!productForm) {
    return;
  }

  if (imageFileInput) {
    imageFileInput.addEventListener('change', handleImagePreview);
  }

  const params = new URLSearchParams(window.location.search);
  const productId = params.get('id');

  if (productId) {
    await fillFormForEditing(productId);
  }

  productForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const payload = buildProductPayload();
    const submitButton = document.getElementById('submitButton');
    const selectedFile = imageFileInput && imageFileInput.files ? imageFileInput.files[0] : null;

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = productId ? 'Salvando...' : 'Criando...';
    }

    if (selectedFile) {
      const uploadResult = await uploadProductImage(selectedFile);

      if (!uploadResult || !uploadResult.imageUrl) {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = 'Salvar produto';
        }

        return;
      }

      payload.imageUrl = uploadResult.imageUrl;
      document.getElementById('imageUrl').value = uploadResult.imageUrl;
      updateImageUploadHint(uploadResult.provider);
    }

    const response = productId
      ? await updateProduct(productId, payload)
      : await createProduct(payload);

    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = productId ? 'Salvar produto' : 'Salvar produto';
    }

    if (!response) {
      return;
    }

    await showLegacyAdminNotice(
      productId ? 'Produto atualizado com sucesso.' : 'Produto criado com sucesso.',
    );
    window.location.href = 'produtos.html';
  });
});

function buildProductPayload() {
  return {
    name: document.getElementById('name').value.trim(),
    description: document.getElementById('description').value.trim(),
    price: Number(document.getElementById('price').value),
    stock: Number(document.getElementById('stock').value),
    categoryId: Number(document.getElementById('categoryId').value),
    imageUrl: document.getElementById('imageUrl').value.trim(),
  };
}

function updateImagePreview(imageUrl) {
  const imagePreview = document.getElementById('imagePreview');
  const placeholder = document.getElementById('imagePreviewPlaceholder');

  if (!imagePreview || !placeholder) {
    return;
  }

  if (!imageUrl) {
    imagePreview.hidden = true;
    imagePreview.removeAttribute('src');
    placeholder.hidden = false;
    return;
  }

  imagePreview.src = imageUrl;
  imagePreview.hidden = false;
  placeholder.hidden = true;
}

function updateImageUploadHint(provider) {
  const imageUploadHint = document.getElementById('imageUploadHint');

  if (!imageUploadHint) {
    return;
  }

  imageUploadHint.textContent =
    provider === 'cloudinary'
      ? 'Imagem enviada para o Cloudinary.'
      : 'Imagem enviada para o armazenamento local do backend.';
}

function handleImagePreview(event) {
  const input = event.target;
  const file = input.files && input.files[0];

  if (!file) {
    updateImagePreview(document.getElementById('imageUrl').value.trim());
    return;
  }

  const temporaryUrl = URL.createObjectURL(file);
  updateImagePreview(temporaryUrl);
}

async function fillFormForEditing(productId) {
  const product = await getProductById(productId);

  if (!product) {
    await showLegacyAdminNotice('Produto nao encontrado.');
    window.location.href = 'produtos.html';
    return;
  }

  document.getElementById('formPageTitle').textContent = 'Editar Produto';
  document.getElementById('formTitle').textContent = `Editar produto #${product.id}`;
  document.getElementById('name').value = product.name || '';
  document.getElementById('description').value = product.description || '';
  document.getElementById('price').value = Number(product.price || 0);
  document.getElementById('stock').value = Number(product.stock || 0);
  document.getElementById('categoryId').value = Number(product.categoryId || 0);
  document.getElementById('imageUrl').value = product.imageUrl || '';
  updateImagePreview(product.imageUrl || '');
  updateImageUploadHint(
    product.imageUrl && product.imageUrl.includes('cloudinary.com') ? 'cloudinary' : 'local',
  );
}

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
