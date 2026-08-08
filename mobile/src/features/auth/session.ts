import * as SecureStore from 'expo-secure-store';
import { setMemoryToken } from '@/src/stores/tokenStore';

export const AUTH_USER_KEY = 'split_striker_user';
export const AUTH_TOKEN_KEY = 'split_striker_token';

export async function persistSession(token: string, userJson: string): Promise<void> {
  setMemoryToken(token);
  await Promise.all([
    SecureStore.setItemAsync(AUTH_TOKEN_KEY, token),
    SecureStore.setItemAsync(AUTH_USER_KEY, userJson),
  ]);
}

export async function clearPersistedSession(): Promise<void> {
  setMemoryToken(null);
  await Promise.all([
    SecureStore.deleteItemAsync(AUTH_TOKEN_KEY),
    SecureStore.deleteItemAsync(AUTH_USER_KEY),
  ]);
}

export async function readPersistedSession(): Promise<{
  token: string | null;
  userJson: string | null;
}> {
  const [token, userJson] = await Promise.all([
    SecureStore.getItemAsync(AUTH_TOKEN_KEY),
    SecureStore.getItemAsync(AUTH_USER_KEY),
  ]);
  return { token, userJson };
}
