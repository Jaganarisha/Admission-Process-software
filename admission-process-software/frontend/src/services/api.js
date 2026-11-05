import axios from 'axios';

// Same-origin '/api' (Vite proxy in dev, CloudFront behaviour in production). The JWT lives in an httpOnly cookie.
const api = axios.create({ baseURL: '/api', withCredentials: true });

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const url = err.config?.url || '';
    if (err.response?.status === 401 && !url.startsWith('/auth/')) window.dispatchEvent(new Event('auth:expired'));
    return Promise.reject(err);
  },
);

export const errorMessage = (err) => err.response?.data?.message || (err.request ? 'Cannot reach the server. Check your connection.' : 'Something went wrong');
export const fieldErrors = (err) => err.response?.data?.errors || {};
export default api;

/** Opens a stored document (owner or staff) in a new tab. Files are fetched with the session cookie, never via public URLs. */
export async function openDocument(id) {
  const w = window.open('', '_blank');
  try {
    const { data } = await api.get(`/documents/${id}/file`, { responseType: 'blob' });
    const url = URL.createObjectURL(data);
    if (w) w.location.href = url; else window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) {
    if (w) w.close();
    throw e;
  }
}

/** Downloads a CSV from an authenticated endpoint. */
export async function downloadCsv(url, params, filename) {
  const { data } = await api.get(url, { params, responseType: 'blob' });
  const href = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = href; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(href);
}
