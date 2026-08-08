import { Redirect } from 'expo-router';
import { useAuthStore } from '@/src/stores/authStore';
import { LoadingView } from '@/src/components/ui/StateViews';

export default function Index() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);

  if (!hydrated || status === 'bootstrapping') {
    return <LoadingView label="Restoring your session…" />;
  }

  if (user && status === 'authenticated') {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/welcome" />;
}
