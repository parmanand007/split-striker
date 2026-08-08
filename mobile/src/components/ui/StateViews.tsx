import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { Screen } from './Screen';
import { useThemeStore } from '@/src/stores/themeStore';

export function LoadingView({
  label = 'Loading…',
  framed = true,
}: {
  label?: string;
  /** Wrap in Screen for safe-area + themed background. */
  framed?: boolean;
}) {
  const t = useThemeStore((s) => s.tokens);
  const body = (
    <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator size="large" color={t.brand500} />
      <Text style={{ color: t.textMuted, marginTop: 12 }}>{label}</Text>
    </View>
  );
  return framed ? <Screen>{body}</Screen> : body;
}

export function EmptyView({
  title,
  message,
  actionLabel,
  onAction,
  compact,
}: {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Use inside ScrollView — avoids flex:1 collapsing layout. */
  compact?: boolean;
}) {
  const t = useThemeStore((s) => s.tokens);
  return (
    <View style={[compact ? styles.compact : styles.center, styles.pad]}>
      <Text style={[styles.title, { color: t.text }]}>{title}</Text>
      {message ? <Text style={{ color: t.textMuted, textAlign: 'center' }}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} style={{ marginTop: 16, minWidth: 180 }} />
      ) : null}
    </View>
  );
}

export function ErrorView({
  message,
  onRetry,
  framed = true,
}: {
  message: string;
  onRetry?: () => void;
  framed?: boolean;
}) {
  const t = useThemeStore((s) => s.tokens);
  const body = (
    <View style={[styles.center, styles.pad]} accessibilityRole="alert">
      <Text style={[styles.title, { color: t.danger }]}>Something went wrong</Text>
      <Text style={{ color: t.textMuted, textAlign: 'center' }}>{message}</Text>
      {onRetry ? <Button title="Try again" onPress={onRetry} style={{ marginTop: 16 }} /> : null}
    </View>
  );
  return framed ? <Screen>{body}</Screen> : body;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  compact: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  pad: { padding: 24, gap: 8 },
  title: { fontSize: 18, fontWeight: '700' },
});
