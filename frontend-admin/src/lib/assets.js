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

  return url;
}

function getApiOrigin() {
  const apiUrl = import.meta.env.VITE_API_URL || '/admin';

  try {
    return new URL(apiUrl, window.location.origin).origin;
  } catch {
    return window.location.origin;
  }
}
