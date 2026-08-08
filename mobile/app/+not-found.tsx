import { Link, Stack } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { Screen } from '@/src/components/ui/Screen';
import { useThemeStore } from '@/src/stores/themeStore';

export default function NotFoundScreen() {
  const t = useThemeStore((s) => s.tokens);
  return (
    <>
      <Stack.Screen options={{ title: 'Not found', headerShown: true }} />
      <Screen withHeader style={styles.wrap}>
        <Text style={[styles.title, { color: t.text }]}>This screen does not exist.</Text>
        <Link href="/" style={styles.link} accessibilityRole="link">
          <Text style={[styles.linkText, { color: t.brand500 }]}>Go home</Text>
        </Link>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  link: { marginTop: 16, minHeight: 44, justifyContent: 'center' },
  linkText: { fontWeight: '600' },
});
