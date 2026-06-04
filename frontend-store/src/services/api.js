const API_URL = (import.meta.env.VITE_STORE_API_URL || '/store').replace(/\/$/, '');
export const STORE_AUTH_EXPIRED_EVENT = 'store-auth-expired';

function notifyAuthExpired(message) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(STORE_AUTH_EXPIRED_EVENT, {
      detail: {
        message: message || 'Sua sessão expirou. Entre novamente para continuar.',
      },
    }),
  );
}

async function parseJson(response) {
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function request(pathname, options = {}) {
  const { skipAuthExpired, ...fetchOptions } = options;
  const response = await fetch(`${API_URL}${pathname}`, fetchOptions);
  const data = await parseJson(response);

  if (!response.ok) {
    const message = data?.error || 'Falha ao carregar dados da loja.';
    const error = new Error(message);
    error.status = response.status;
    error.code = data?.code;
    error.data = data;
    error.shippingOptions = data?.shippingOptions;

    if (response.status === 401 && !skipAuthExpired && !pathname.startsWith('/auth/')) {
      notifyAuthExpired('Sua sessão expirou. Entre novamente para continuar.');
    }

    throw error;
  }

  if (data === null) {
    throw new Error('A API da loja nao retornou dados válidos.');
  }

  return data;
}

async function requestJson(pathname, payload) {
  return request(pathname, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

async function requestAuthorized(pathname, token, options = {}) {
  return request(pathname, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

export function getStoreCategories() {
  return request('/categories');
}

export function getStoreProducts(params = {}) {
  const searchParams = new URLSearchParams();

  if (params.categoryId) {
    searchParams.set('categoryId', String(params.categoryId));
  }

  if (params.search) {
    searchParams.set('search', params.search);
  }

  const queryString = searchParams.toString();

  return request(`/products${queryString ? `?${queryString}` : ''}`);
}

export function getStoreProductById(productId) {
  return request(`/products/${productId}`);
}

export function createAvailabilityLead(productId, payload, token = '') {
  if (token) {
    return requestAuthorized(`/products/${productId}/availability-leads`, token, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  }

  return requestJson(`/products/${productId}/availability-leads`, payload);
}

// Login com Google desativado por enquanto.
// Para reativar, restaure a rota POST /store/auth/google no backend e use esta chamada na AccountPage.
// export function loginStoreWithGoogle(credential) {
//   return requestJson('/auth/google', { credential });
// }

export function registerStoreCustomer(payload) {
  return requestJson('/auth/register', payload);
}

export function loginStoreCustomer(payload) {
  return requestJson('/auth/login', payload);
}

export function requestStorePasswordReset(payload) {
  return requestJson('/auth/password-reset/request', payload);
}

export function confirmStorePasswordReset(payload) {
  return requestJson('/auth/password-reset/confirm', payload);
}

export function getStoreCustomerProfile(token, options = {}) {
  return requestAuthorized('/me', token, options);
}

export function updateStoreCustomerDefaultAddress(token, payload) {
  return requestAuthorized('/me/address', token, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export function getStoreCustomerOrders(token) {
  return requestAuthorized('/me/orders', token);
}

export function getStoreCustomerAvailabilityLeads(token) {
  return requestAuthorized('/me/availability-leads', token);
}

export function createStoreOrder(token, payload) {
  return requestAuthorized('/orders', token, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export function calculateStoreShipping(payload) {
  return requestJson('/shipping/calculate', payload);
}

export function getStoreOrderById(token, orderId) {
  return requestAuthorized(`/orders/${orderId}`, token);
}

export function getStoreOrderPayment(token, orderId) {
  return requestAuthorized(`/orders/${orderId}/payment`, token);
}

export function getStoreOrderByTrackingToken(trackingToken) {
  return request(`/orders/tracking/${trackingToken}`);
}

export function completeTestStoreOrderPayment(token, orderId) {
  return requestAuthorized(`/orders/${orderId}/complete-test-payment`, token, {
    method: 'POST',
  });
}
