import { Stack } from 'expo-router';
import { MARKETING } from '@/src/theme/themes';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: MARKETING.bg },
      }}
    />
  );
}
