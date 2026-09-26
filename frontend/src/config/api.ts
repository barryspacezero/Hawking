/**
 * API base URL.
 * In dev, Vite proxies `/api` to the backend so uploads work without CORS issues.
 */
export const API_URL = import.meta.env.DEV 
  ? (import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '/api') 
  : '/api';

export async function parseApiError(res: Response, fallback = 'Request failed'): Promise<string> {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await res.json().catch(() => ({}));
    const detail = data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map((item) => item.msg || String(item)).join(', ');
    return fallback;
  }
  const text = await res.text().catch(() => '');
  return text || fallback;
}

export function networkErrorMessage(error: unknown): string {
  if (error instanceof TypeError && /fetch/i.test(error.message)) {
    return 'Could not reach the Hawking server. Make sure the backend is running on port 8000.';
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}

