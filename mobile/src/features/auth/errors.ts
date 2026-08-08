import { ApiError } from '@/src/types/api';

/** Map backend / network failures to user-facing auth copy. */
export function getAuthErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return error.detail || 'Invalid email or password.';
    }
    if (error.status === 400) {
      return error.detail || 'Please check your details and try again.';
    }
    if (error.status === 0 || error.status >= 500) {
      return 'Server error. Please try again in a moment.';
    }
    return error.detail || fallback;
  }

  if (error instanceof TypeError) {
    // fetch() network failure
    return 'Cannot reach the server. Check that the backend is running and API_BASE_URL is correct for this device.';
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}
