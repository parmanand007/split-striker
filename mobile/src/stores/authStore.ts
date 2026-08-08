import { create } from 'zustand';
import type { User } from '@/src/types/api';
import { ApiError } from '@/src/types/api';
import { setMemoryToken } from '@/src/stores/tokenStore';
import {
  clearPersistedSession,
  persistSession,
  readPersistedSession,
} from '@/src/features/auth/session';

export type AuthStatus =
  | 'bootstrapping' // reading secure store / verifying token
  | 'authenticated'
  | 'unauthenticated';

interface AuthState {
  user: User | null;
  token: string | null;
  status: AuthStatus;
  /** True once first hydrate attempt finished (success or fail). */
  hydrated: boolean;
  /** Set when a 401 cleared the session mid-app. */
  sessionExpiredMessage: string | null;
  /** Consumed by AuthGate after login/signup (e.g. invite return path). */
  pendingRedirect: string | null;
  hydrate: () => Promise<void>;
  login: (user: User, token: string, redirectTo?: string | null) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  clearSessionExpiredMessage: () => void;
  consumePendingRedirect: () => string | null;
  /** Called by API client on 401 — clears storage + marks expired. */
  handleUnauthorized: (detail?: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  status: 'bootstrapping',
  hydrated: false,
  sessionExpiredMessage: null,
  pendingRedirect: null,

  hydrate: async () => {
    set({ status: 'bootstrapping' });

    try {
      const { token, userJson } = await readPersistedSession();

      if (!token || !userJson) {
        setMemoryToken(null);
        set({
          user: null,
          token: null,
          status: 'unauthenticated',
          hydrated: true,
        });
        return;
      }

      let parsed: User;
      try {
        parsed = JSON.parse(userJson) as User;
      } catch {
        await clearPersistedSession();
        set({
          user: null,
          token: null,
          status: 'unauthenticated',
          hydrated: true,
        });
        return;
      }

      // Optimistic restore so UI can paint; then verify with backend.
      setMemoryToken(token);
      set({ token, user: parsed });

      try {
        const { getUser } = await import('@/src/api/users');
        const fresh = await getUser(parsed.id);
        await persistSession(token, JSON.stringify(fresh));
        set({
          user: fresh,
          token,
          status: 'authenticated',
          hydrated: true,
          sessionExpiredMessage: null,
        });
      } catch (error) {
        // Only invalidate on auth/user-missing. Keep session on network/5xx.
        const invalidate =
          error instanceof ApiError && (error.status === 401 || error.status === 404);
        if (invalidate) {
          await clearPersistedSession();
          set({
            user: null,
            token: null,
            status: 'unauthenticated',
            hydrated: true,
            sessionExpiredMessage: 'Your session expired. Please sign in again.',
          });
          return;
        }

        set({
          user: parsed,
          token,
          status: 'authenticated',
          hydrated: true,
          sessionExpiredMessage: null,
        });
      }
    } catch {
      setMemoryToken(null);
      set({
        user: null,
        token: null,
        status: 'unauthenticated',
        hydrated: true,
      });
    }
  },

  login: async (user, token, redirectTo) => {
    await persistSession(token, JSON.stringify(user));
    set({
      user,
      token,
      status: 'authenticated',
      hydrated: true,
      sessionExpiredMessage: null,
      pendingRedirect: redirectTo ?? null,
    });
  },

  logout: async () => {
    await clearPersistedSession();
    set({
      user: null,
      token: null,
      status: 'unauthenticated',
      sessionExpiredMessage: null,
      pendingRedirect: null,
    });
  },

  setUser: (user) => {
    const token = get().token;
    set({ user });
    if (token) {
      void persistSession(token, JSON.stringify(user));
    }
  },

  clearSessionExpiredMessage: () => set({ sessionExpiredMessage: null }),

  consumePendingRedirect: () => {
    const next = get().pendingRedirect;
    if (next) set({ pendingRedirect: null });
    return next;
  },

  handleUnauthorized: async (detail) => {
    // Avoid loops if already cleared
    if (get().status === 'unauthenticated' && !get().token) return;
    await clearPersistedSession();
    set({
      user: null,
      token: null,
      status: 'unauthenticated',
      sessionExpiredMessage:
        detail || 'Your session expired. Please sign in again.',
    });
  },
}));
