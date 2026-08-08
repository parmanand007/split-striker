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

/** Host running Metro (e.g. 192.168.1.14) — same machine as the API in local dev. */
function metroLanHost(): string | null {
  const candidates = [
    Constants.expoConfig?.hostUri,
    // Expo Go / dev-client manifest fields
    (Constants as { manifest2?: { extra?: { expoClient?: { hostUri?: string } } } }).manifest2
      ?.extra?.expoClient?.hostUri,
    (Constants as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost,
    Constants.linkingUri,
  ].filter(Boolean) as string[];

  for (const raw of candidates) {
    const hostPort = raw.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').split('/')[0] ?? '';
    const host = hostPort.split(':')[0]?.replace(/^\[|\]$/g, '') ?? '';
    if (
      host &&
      host !== 'localhost' &&
      host !== '127.0.0.1' &&
      host !== '10.0.2.2' &&
      !host.endsWith('.exp.direct')
    ) {
      return host;
    }
  }
  return null;
}

/**
 * Resolve API base URL (must include `/api`).
 *
 * Priority:
 * 1. EXPO_PUBLIC_API_BASE_URL (Metro/.env — wins over stale native embeds)
 * 2. app.config extra.apiBaseUrl
 * 3. Default http://127.0.0.1:8000/api (development only)
 *
 * Platform rewrites (development):
 * - web: private LAN + localhost → 127.0.0.1
 * - Android emulator: localhost/127.0.0.1 → 10.0.2.2
 * - Physical device: loopback → Metro LAN host (same Mac as Expo)
 */
function resolveApiBaseUrl(): string {
  const fromEnv = (process.env.EXPO_PUBLIC_API_BASE_URL || '').trim().replace(/\/$/, '');
  const fromExtra = String(extra.apiBaseUrl || '')
    .trim()
    .replace(/\/$/, '');
  const raw = fromEnv || fromExtra;

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

  // Physical device: 127.0.0.1 is the phone itself — rewrite to Metro's Mac IP.
  if (
    Platform.OS !== 'web' &&
    (configured.includes('://localhost') || configured.includes('://127.0.0.1'))
  ) {
    const lan = metroLanHost();
    if (lan) {
      return configured
        .replace('://localhost', `://${lan}`)
        .replace('://127.0.0.1', `://${lan}`);
    }
  }

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
