
import axios from 'axios';

// Same-origin API for local development and Render production.
const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Handle expired authentication sessions.
api.interceptors.response.use(
  (response) => response,
  (err) => {
    const url = err.config?.url || '';

    if (
      err.response?.status === 401 &&
      !url.startsWith('/auth/')
    ) {
      window.dispatchEvent(new Event('auth:expired'));
    }

    return Promise.reject(err);
  },
);

// Return readable error messages.
export const errorMessage = (err) =>
  err.response?.data?.message ||
  (err.request
    ? 'Cannot reach the server. Check your connection.'
    : 'Something went wrong');

// Return validation errors.
export const fieldErrors = (err) =>
  err.response?.data?.errors || {};

// Default API export.
export default api;

/**
 * Opens a stored document using the authenticated session cookie.
 */
export async function openDocument(id) {
  const w = window.open('', '_blank');

  try {
    const { data } = await api.get(
      `/documents/${id}/file`,
      {
        responseType: 'blob',
      },
    );

    const url = URL.createObjectURL(data);

    if (w) {
      w.location.href = url;
    } else {
      window.open(url, '_blank');
    }

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 60000);
  } catch (e) {
    if (w) {
      w.close();
    }

    throw e;
  }
}

/**
 * Downloads CSV files from authenticated API endpoints.
 */
export async function downloadCsv(url, params, filename) {
  const { data } = await api.get(url, {
    params,
    responseType: 'blob',
  });

  const href = URL.createObjectURL(data);

  const a = document.createElement('a');
  a.href = href;
  a.download = filename;

  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(href);
}
