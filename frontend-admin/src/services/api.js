import { clearAdminToken, getAdminToken } from '../lib/auth';

const API_URL = (import.meta.env.VITE_API_URL || '/admin').replace(/\/$/, '');
const SESSION_EXPIRED_MESSAGE = 'Sessão expirada ou acesso negado. Entre novamente para continuar.';

function redirectToLogin() {
  if (typeof window === 'undefined') {
    return;
  }

  const currentPath = `${window.location.pathname}${window.location.search || ''}`;
  const isLoginPage = window.location.pathname === '/';

  window.sessionStorage.setItem('adminAuthMessage', SESSION_EXPIRED_MESSAGE);

  if (!isLoginPage) {
    window.sessionStorage.setItem('adminAuthRedirectTo', currentPath || '/dashboard');
    window.location.assign('/');
  }
}

async function parseJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function parseErrorPayload(response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return parseJson(response);
  }

  try {
    const text = await response.text();
    return text ? { message: text } : null;
  } catch {
    return null;
  }
}

function buildErrorMessage(data, fallbackMessage, status) {
  if (data && typeof data === 'object') {
    const message = data.error || data.message;

    if (message) {
      return message;
    }
  }

  return status ? `${fallbackMessage} HTTP ${status}.` : fallbackMessage;
}

function withAuthHeaders(headers = {}) {
  const token = getAdminToken();

  if (!token) {
    return headers;
  }

  return {
    ...headers,
    Authorization: `Bearer ${token}`,
  };
}

async function request(pathname, init = {}) {
  const response = await fetch(`${API_URL}${pathname}`, {
    ...init,
    headers: withAuthHeaders(init.headers),
  });

  if (response.status === 401) {
    clearAdminToken();
    redirectToLogin();
    throw new Error(SESSION_EXPIRED_MESSAGE);
  }

  if (!response.ok) {
    const errorData = await parseErrorPayload(response);
    throw new Error(buildErrorMessage(errorData, 'Falha ao processar requisição.', response.status));
  }

  return response;
}

export async function loginAdmin(payload) {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await parseJson(response);

  if (!response.ok) {
    throw new Error(buildErrorMessage(data, 'Erro ao fazer login.'));
  }

  return data;
}

export async function getProducts() {
  const response = await request('/products');
  return response.json();
}

export async function getDashboard() {
  const response = await request('/dashboard');
  return response.json();
}

export async function getFiscalIntegrationStatus() {
  const response = await request('/fiscal/status');
  return response.json();
}

export async function getOrderFiscalDocuments(orderId) {
  const response = await request(`/orders/${orderId}/fiscal-documents`);
  return response.json();
}

export async function prepareOrderFiscalDocument(orderId) {
  const response = await request(`/orders/${orderId}/fiscal-documents/prepare`, {
    method: 'POST',
  });

  return response.json();
}

export async function issueOrderFiscalDocument(orderId) {
  const response = await request(`/orders/${orderId}/fiscal-documents/issue`, {
    method: 'POST',
  });

  return response.json();
}

export async function syncOrderFiscalDocument(orderId, documentId) {
  const response = await request(`/orders/${orderId}/fiscal-documents/${documentId}/sync`, {
    method: 'POST',
  });

  return response.json();
}

export async function getCategories() {
  const response = await request('/categories');
  return response.json();
}

export async function getCategoryById(categoryId) {
  const categories = await getCategories();
  return categories.find((category) => Number(category.id) === Number(categoryId)) || null;
}

export async function getAvailabilityLeads() {
  const response = await request('/availability-leads');
  return response.json();
}

export async function updateAvailabilityLead(leadId, payload) {
  const response = await request(`/availability-leads/${leadId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return response.json();
}

export async function getCustomers() {
  const response = await request('/customers');
  return response.json();
}

export async function getCustomerById(customerId) {
  const response = await request(`/customers/${customerId}`);
  return response.json();
}

export async function updateCustomer(customerId, payload) {
  const response = await request(`/customers/${customerId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return response.json();
}

export async function deleteCustomer(customerId) {
  await request(`/customers/${customerId}`, {
    method: 'DELETE',
  });
}

export async function getOrders(params = {}) {
  const searchParams = new URLSearchParams();

  if (params.search) {
    searchParams.set('search', params.search);
  }

  if (params.status && params.status !== 'all') {
    searchParams.set('status', params.status);
  }

  if (params.statusGroup) {
    searchParams.set('statusGroup', params.statusGroup);
  }

  if (params.page) {
    searchParams.set('page', String(params.page));
  }

  if (params.limit) {
    searchParams.set('limit', String(params.limit));
  }

  if (params.paginated) {
    searchParams.set('paginated', 'true');
  }

  const queryString = searchParams.toString();
  const response = await request(`/orders${queryString ? `?${queryString}` : ''}`);
  const data = await response.json();

  if (params.paginated) {
    return Array.isArray(data) ? { items: data, meta: null } : data;
  }

  return Array.isArray(data) ? data : data.items || [];
}

export async function getOrderById(orderId) {
  const response = await request(`/orders/${orderId}`);
  return response.json();
}

export async function updateOrderStatus(orderId, payload) {
  const response = await request(`/orders/${orderId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return response.json();
}

export async function confirmOrderPayment(orderId) {
  const response = await request(`/orders/${orderId}/confirm-payment`, {
    method: 'POST',
  });

  return response.json();
}

export async function updateOrderDetails(orderId, payload) {
  const response = await request(`/orders/${orderId}/details`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return response.json();
}

export async function createOrderShippingLabel(orderId, payload) {
  const response = await request(`/orders/${orderId}/shipping-label/cart`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return response.json();
}

export async function createFullOrderShippingLabel(orderId, payload) {
  const response = await request(`/orders/${orderId}/shipping-label/full`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return response.json();
}

export async function checkoutOrderShippingLabel(orderId) {
  const response = await request(`/orders/${orderId}/shipping-label/checkout`, {
    method: 'POST',
  });

  return response.json();
}

export async function generateOrderShippingLabel(orderId) {
  const response = await request(`/orders/${orderId}/shipping-label/generate`, {
    method: 'POST',
  });

  return response.json();
}

export async function printOrderShippingLabel(orderId) {
  const response = await request(`/orders/${orderId}/shipping-label/print`, {
    method: 'POST',
  });

  return response.json();
}

export async function getAdminNotifications() {
  const response = await request('/notifications');
  return response.json();
}

export async function getMelhorEnvioBalance() {
  const response = await request('/melhor-envio/balance');
  return response.json();
}

export async function getMelhorEnvioAccount() {
  const response = await request('/melhor-envio/account');
  return response.json();
}

export async function createCategory(payload) {
  const response = await request('/categories', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return response.json();
}

export async function updateCategory(categoryId, payload) {
  const response = await request(`/categories/${categoryId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return response.json();
}

export async function deleteCategory(categoryId) {
  await request(`/categories/${categoryId}`, {
    method: 'DELETE',
  });
}

export async function getProductById(productId) {
  const response = await request(`/products/${productId}`);
  return response.json();
}

export async function createProduct(payload) {
  const response = await request('/products', {
    method: 'POST',
    body: buildProductFormData(payload),
  });

  return response.json();
}

export async function updateProduct(productId, payload) {
  const response = await request(`/products/${productId}`, {
    method: 'PUT',
    body: buildProductFormData(payload),
  });

  return response.json();
}

export async function deleteProduct(productId) {
  await request(`/products/${productId}`, {
    method: 'DELETE',
  });
}

export async function uploadProductImage(file) {
  const formData = new FormData();
  formData.append('image', file);

  const response = await request('/upload-image', {
    method: 'POST',
    body: formData,
  });

  return response.json();
}

function buildProductFormData(payload) {
  const formData = new FormData();
  formData.append('name', payload.name);
  formData.append('description', payload.description);
  formData.append('price', String(payload.price));
  formData.append('stock', String(payload.stock));
  formData.append('visible', String(payload.visible));
  formData.append('categoryId', String(payload.categoryId));

  if (payload.imageUrl) {
    formData.append('imageUrl', payload.imageUrl);
  }

  if (payload.imageFile) {
    formData.append('image', payload.imageFile);
  }

  if (payload.galleryImageUrls) {
    formData.append('galleryImageUrls', JSON.stringify(payload.galleryImageUrls));
  }

  if (payload.variants) {
    formData.append('variants', JSON.stringify(payload.variants));
  }

  return formData;
}

export function getAdminSettings() {
  return request('/settings', 'GET');
}

export function updateAdminSettings(payload) {
  return request('/settings', 'PUT', JSON.stringify(payload));
}
