import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { login as loginApi, signup as signupApi } from '@/src/api/auth';
import { useAuthStore } from '@/src/stores/authStore';
import { getAuthErrorMessage } from '@/src/features/auth/errors';

function sanitizeRedirect(next?: string | null): string | null {
  if (!next) return null;
  const decoded = decodeURIComponent(next);
  if (decoded.startsWith('/') && !decoded.startsWith('//')) return decoded;
  return null;
}

export function useAuthActions() {
  const loginStore = useAuthStore((s) => s.login);
  const logoutStore = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const signIn = useCallback(
    async (email: string, password: string, next?: string | null) => {
      setBusy(true);
      setError(null);
      try {
        const result = await loginApi(email, password);
        // Clear the cache before setting the user — loginStore's state update
        // triggers an immediate redirect to tabs, whose queries start firing
        // as soon as `user` is set. Clearing after that point can cancel
        // those freshly-started requests mid-flight (they never retry).
        queryClient.clear();
        // AuthGate consumes pendingRedirect to avoid racing with login→tabs.
        await loginStore(result.user, result.token, sanitizeRedirect(next));
        return true;
      } catch (e) {
        setError(getAuthErrorMessage(e, 'Sign in failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [loginStore, queryClient],
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string, next?: string | null) => {
      setBusy(true);
      setError(null);
      try {
        const result = await signupApi(name, email, password);
        // See signIn: clear before setting the user, not after — avoids
        // cancelling the new Home screen's just-started queries mid-flight.
        queryClient.clear();
        await loginStore(result.user, result.token, sanitizeRedirect(next));
        return true;
      } catch (e) {
        setError(getAuthErrorMessage(e, 'Could not create account'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [loginStore, queryClient],
  );

  const signOut = useCallback(async () => {
    setBusy(true);
    try {
      await logoutStore();
      queryClient.clear();
      router.replace('/(auth)/welcome');
    } finally {
      setBusy(false);
    }
  }, [logoutStore, queryClient, router]);

  return { busy, error, clearError, signIn, signUp, signOut };
}
