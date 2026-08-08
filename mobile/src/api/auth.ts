import { apiRequest } from './client';
import type { AuthResponse } from '@/src/types/api';

export function login(email: string, password: string) {
  return apiRequest<AuthResponse>(
    'POST',
    '/auth/login',
    { email: email.trim().toLowerCase(), password },
    { auth: false },
  );
}

export function signup(name: string, email: string, password: string) {
  return apiRequest<AuthResponse>(
    'POST',
    '/auth/signup',
    {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
    },
    { auth: false },
  );
}
