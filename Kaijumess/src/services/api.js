const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');

const buildApiUrl = (path) => {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
};

export const apiRequest = async (path, options = {}) => {
  const headers = new Headers(options.headers || {});
  const hasBody = options.body !== undefined;

  if (hasBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response;

  try {
    response = await fetch(buildApiUrl(path), {
      ...options,
      headers,
    });
  } catch (error) {
    const networkError = new Error('Khong the ket noi den backend.');
    networkError.code = 'NETWORK_ERROR';
    networkError.cause = error;
    throw networkError;
  }

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const error = new Error(
      typeof payload === 'object' && payload?.message
        ? payload.message
        : 'Yeu cau toi backend that bai.'
    );

    if (typeof payload === 'object' && payload) {
      error.code = payload.code;
      error.field = payload.field;
    }

    error.status = response.status;
    throw error;
  }

  return payload;
};
