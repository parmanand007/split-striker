import { API_BASE_URL } from '@/src/config/env';
import { ApiError } from '@/src/types/api';
import { getMemoryToken } from '@/src/stores/tokenStore';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

function formatDetail(detail: unknown, fallback: string): string {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'msg' in item) {
          return String((item as { msg: string }).msg);
        }
        return JSON.stringify(item);
      })
      .join(', ');
  }
  if (detail && typeof detail === 'object') return JSON.stringify(detail);
  return fallback;
}

export async function apiRequest<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  options?: { auth?: boolean },
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const useAuth = options?.auth !== false;
  if (useAuth) {
    const token = getMemoryToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    // Normalize network failures so UI can show a clear message.
    throw new TypeError(
      error instanceof Error
        ? `Network error: ${error.message}`
        : 'Network error while contacting the API',
    );
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ detail: res.statusText }));
    const detail = formatDetail(errBody?.detail ?? errBody, res.statusText);

    if (res.status === 401 && useAuth) {
      const { useAuthStore } = await import('@/src/stores/authStore');
      await useAuthStore.getState().handleUnauthorized(
        detail === 'Invalid or expired token.' || detail === 'Authentication required.'
          ? 'Your session expired. Please sign in again.'
          : detail,
      );
    }

    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return null as T;
  return (await res.json()) as T;
}
