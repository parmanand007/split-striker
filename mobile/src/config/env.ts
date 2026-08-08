import { Platform } from 'react-native';
import Constants from 'expo-constants';

type AppEnv = 'development' | 'staging' | 'production';

const extra = Constants.expoConfig?.extra ?? {};

export const APP_ENV: AppEnv =
  (extra.appEnv as AppEnv) ||
  (process.env.EXPO_PUBLIC_APP_ENV as AppEnv) ||
  'development';

function isLoopbackUrl(url: string): boolean {
  return (
    url.includes('://localhost') ||
    url.includes('://127.0.0.1') ||
    url.includes('://10.0.2.2')
  );
}

function isPrivateLanHost(url: string): boolean {
  return /:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)/.test(
    url,
  );
}

/**
 * Resolve API base URL (must include `/api`).
 *
 * Priority:
 * 1. EXPO_PUBLIC_API_BASE_URL / app.config extra.apiBaseUrl
 * 2. Default http://127.0.0.1:8000/api (development only)
 *
 * Platform rewrites (development):
 * - web / iOS Simulator: private LAN + localhost → 127.0.0.1 (browser/sim share host net)
 * - Android emulator: localhost/127.0.0.1 → 10.0.2.2
 * - Physical device: keep the LAN IP from .env (backend must use --host 0.0.0.0)
 */
function resolveApiBaseUrl(): string {
  const raw = (
    (extra.apiBaseUrl as string | undefined) ||
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    ''
  )
    .trim()
    .replace(/\/$/, '');

  if (APP_ENV === 'production') {
    if (!raw || isLoopbackUrl(raw) || !raw.startsWith('https://')) {
      throw new Error(
        'Production builds require EXPO_PUBLIC_API_BASE_URL to be an https:// API URL (with /api).',
      );
    }
    return raw;
  }

  let configured = raw || 'http://127.0.0.1:8000/api';

  // Expo web runs in the browser on this machine — always hit loopback.
  // A LAN IP in .env is for phones; browsers fail when uvicorn binds 127.0.0.1 only.
  if (Platform.OS === 'web' && (isLoopbackUrl(configured) || isPrivateLanHost(configured))) {
    const path = configured.replace(/^https?:\/\/[^/?#]+/, '') || '/api';
    return `http://127.0.0.1:8000${path}`.replace(/\/$/, '');
  }

  // Android emulator reaches the host machine via 10.0.2.2, not loopback.
  if (
    Platform.OS === 'android' &&
    (configured.includes('://localhost') || configured.includes('://127.0.0.1'))
  ) {
    return configured
      .replace('://localhost', '://10.0.2.2')
      .replace('://127.0.0.1', '://10.0.2.2');
  }

  // Normalize localhost → 127.0.0.1 for iOS Simulator to avoid IPv6 mismatches.
  if (configured.includes('://localhost')) {
    return configured.replace('://localhost', '://127.0.0.1');
  }

  return configured;
}

export const API_BASE_URL: string = resolveApiBaseUrl();

export const IS_DEV = APP_ENV === 'development';

/** Human-readable hint for Profile / debug screens. */
export function apiUrlHint(): string {
  if (Platform.OS === 'web') {
    return `${API_BASE_URL} (Expo web → host loopback)`;
  }
  if (Platform.OS === 'android' && API_BASE_URL.includes('10.0.2.2')) {
    return `${API_BASE_URL} (Android emulator → host machine)`;
  }
  if (API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1')) {
    return `${API_BASE_URL} (simulator/host). Physical device needs your LAN IP.`;
  }
  return API_BASE_URL;
}
