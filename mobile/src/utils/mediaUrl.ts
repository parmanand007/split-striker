import { API_BASE_URL } from '@/src/config/env';

/** Turn an API-relative media path into a fetchable URL. */
export function resolveMediaUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const origin = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}
