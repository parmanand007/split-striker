import { Stack } from 'expo-router';
import { useThemeStore } from '@/src/stores/themeStore';

export default function GroupStackLayout() {
  const t = useThemeStore((s) => s.tokens);
  return (
    <Stack
      screenOptions={{
        headerTintColor: t.brand500,
        headerStyle: { backgroundColor: t.pageBg },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: t.pageBg },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Group' }} />
      <Stack.Screen name="members" options={{ title: 'Members' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      <Stack.Screen name="settle" options={{ title: 'Settle up', presentation: 'modal' }} />
    </Stack>
  );
}
