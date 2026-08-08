import { Link, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';
import { AppText } from '@/src/components/ui/AppText';
import { fonts } from '@/src/theme/typography';
import { Screen } from '@/src/components/ui/Screen';
import { useThemeStore } from '@/src/stores/themeStore';

export default function NotFoundScreen() {
  const t = useThemeStore((s) => s.tokens);
  return (
    <>
      <Stack.Screen options={{ title: 'Not found', headerShown: true }} />
      <Screen withHeader style={styles.wrap}>
        <AppText style={[styles.title, { color: t.text }]}>This screen does not exist.</AppText>
        <Link href="/" style={styles.link} accessibilityRole="link">
          <AppText style={[styles.linkText, { color: t.brand500 }]}>Go home</AppText>
        </Link>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 18, fontFamily: fonts.bold, textAlign: 'center' },
  link: { marginTop: 16, minHeight: 44, justifyContent: 'center' },
  linkText: { fontFamily: fonts.semibold },
});
