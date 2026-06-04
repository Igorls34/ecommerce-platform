export function resolveAssetUrl(url) {
  if (!url || typeof url !== 'string') {
    return '';
  }

  const localUploadsUrl = url.match(/^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(\/uploads\/.*)$/i);

  if (localUploadsUrl) {
    return `${getApiOrigin()}${localUploadsUrl[1]}`;
  }

  if (url.startsWith('/uploads/')) {
    return `${getApiOrigin()}${url}`;
  }

  if (/^(https?:|data:|blob:)/i.test(url)) {
    return url;
  }

  if (!url.startsWith('/images/')) {
    return url;
  }

  const baseUrl = import.meta.env.BASE_URL || '/';

  return `${baseUrl.replace(/\/$/, '')}${url}`;
}

function getApiOrigin() {
  const apiUrl = import.meta.env.VITE_STORE_API_URL || '/store';

  try {
    return new URL(apiUrl, window.location.origin).origin;
  } catch {
    return window.location.origin;
  }
}
