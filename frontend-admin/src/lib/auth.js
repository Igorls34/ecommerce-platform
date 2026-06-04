const TOKEN_KEY = 'adminToken';

export function getAdminToken() {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setAdminToken(token) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearAdminToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated() {
  return Boolean(getAdminToken());
}
