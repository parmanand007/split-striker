import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '@/src/stores/authStore';
import { useThemeStore } from '@/src/stores/themeStore';
import { LoadingView } from '@/src/components/ui/StateViews';
import { ApiError } from '@/src/types/api';

void SplashScreen.preventAutoHideAsync();

// Match web: Inter everywhere (RN types omit defaultProps).
const TextAny = Text as typeof Text & {
  defaultProps?: { style?: { fontFamily?: string } };
};
if (TextAny.defaultProps == null) TextAny.defaultProps = {};
TextAny.defaultProps.style = { fontFamily: 'Inter_400Regular' };

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count, error) =>
        count < 1 && !(error instanceof ApiError && error.status === 401),
      staleTime: 15_000,
    },
  },
});

function AuthGate({ children }: { children: React.ReactNode }) {
  const hydrated = useAuthStore((s) => s.hydrated);
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const pendingRedirect = useAuthStore((s) => s.pendingRedirect);
  const consumePendingRedirect = useAuthStore((s) => s.consumePendingRedirect);
  const segments = useSegments();
  const router = useRouter();
  const qc = useQueryClient();

  // Clear cached server state when session ends (logout / 401).
  useEffect(() => {
    if (status === 'unauthenticated') {
      qc.clear();
    }
  }, [status, qc]);

  useEffect(() => {
    if (!hydrated || status === 'bootstrapping') return;

    const parts = segments as string[];
    const inAuth = parts[0] === '(auth)';
    // Invite lives at (auth)/invite/[token] — keep accessible while authenticated.
    const onInvite = inAuth && parts.includes('invite');

    if (!user && !inAuth) {
      router.replace('/(auth)/welcome');
      return;
    }

    // Authenticated users leave auth screens, except invite accept.
    // Keep pendingRedirect until we leave login/signup so Strict Mode remounts
    // don't drop an invite return path.
    if (user && inAuth && !onInvite) {
      router.replace((pendingRedirect || '/(tabs)') as never);
      return;
    }

    if (user && pendingRedirect && (!inAuth || onInvite)) {
      consumePendingRedirect();
    }
  }, [
    hydrated,
    status,
    user,
    segments,
    router,
    pendingRedirect,
    consumePendingRedirect,
  ]);

  if (!hydrated || status === 'bootstrapping') {
    return (
      <View style={{ flex: 1 }}>
        <LoadingView label="Restoring your session…" framed={false} />
      </View>
    );
  }

  return <>{children}</>;
}

function RootStatusBar() {
  const segments = useSegments();
  const inAuth = (segments as string[])[0] === '(auth)';
  return <StatusBar style={inAuth ? 'light' : 'dark'} />;
}

export default function RootLayout() {
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const pageBg = useThemeStore((s) => s.tokens.pageBg);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    void hydrateTheme();
    void hydrateAuth();
  }, [hydrateAuth, hydrateTheme]);

  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: pageBg }}>
        <LoadingView label="Loading…" framed={false} />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate>
        <RootStatusBar />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: pageBg },
            headerTitleStyle: { fontFamily: 'Inter_700Bold' },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="groups/create"
            options={{ presentation: 'modal', headerShown: true, title: 'Create group' }}
          />
          <Stack.Screen name="groups/[id]" />
          <Stack.Screen
            name="expenses/create"
            options={{ presentation: 'modal', headerShown: true, title: 'Add expense' }}
          />
          <Stack.Screen
            name="expenses/[id]"
            options={{ headerShown: true, title: 'Expense' }}
          />
          <Stack.Screen
            name="expenses/edit"
            options={{ presentation: 'modal', headerShown: true, title: 'Edit expense' }}
          />
        </Stack>
      </AuthGate>
    </QueryClientProvider>
  );
}
