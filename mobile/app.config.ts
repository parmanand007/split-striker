import { ExpoConfig, ConfigContext } from 'expo/config';

const appEnv = process.env.EXPO_PUBLIC_APP_ENV ?? 'development';
const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000/api';
const allowCleartext = appEnv !== 'production';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Split Striker Wise',
  slug: 'split-striker',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'splitstriker',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.splitstriker.app',
    infoPlist: {
      NSAppTransportSecurity: {
        NSAllowsLocalNetworking: true,
      },
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#2c0810',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    package: 'com.splitstriker.app',
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-dev-client',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#2c0810',
      },
    ],
    'expo-secure-store',
    [
      'expo-build-properties',
      {
        android: {
          // Local/LAN HTTP APIs during development. Production should use HTTPS.
          usesCleartextTraffic: allowCleartext,
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    // Prefer 127.0.0.1 over localhost — on some Macs `localhost` resolves via IPv6
    // to a different listener than the uvicorn process bound to 127.0.0.1.
    apiBaseUrl,
    appEnv,
    eas: {
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
});
