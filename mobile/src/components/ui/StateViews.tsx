import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { Screen } from './Screen';
import { Card } from './Card';
import { AppText } from './AppText';
import { useThemeStore } from '@/src/stores/themeStore';

export function LoadingView({
  label = 'Loading…',
  framed = true,
}: {
  label?: string;
  framed?: boolean;
}) {
  const t = useThemeStore((s) => s.tokens);
  const body = (
    <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel={label}>
      <View style={[styles.spinnerRing, { borderColor: t.brand100, borderTopColor: t.brand500 }]}>
        <ActivityIndicator size="large" color={t.brand500} />
      </View>
      <AppText muted style={{ marginTop: 14 }}>
        {label}
      </AppText>
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
  icon = 'file-tray-outline',
}: {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const t = useThemeStore((s) => s.tokens);
  return (
    <View style={[compact ? styles.compact : styles.center, styles.pad]}>
      <View style={[styles.iconWrap, { backgroundColor: t.brand50 }]}>
        <Ionicons name={icon} size={26} color={t.brand500} />
      </View>
      <AppText variant="titleSm" style={{ textAlign: 'center' }}>
        {title}
      </AppText>
      {message ? (
        <AppText muted style={{ textAlign: 'center', marginTop: 4 }}>
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          title={actionLabel}
          fullWidth={false}
          onPress={onAction}
          style={{ marginTop: 18 }}
        />
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
      <Card elevated="md" style={{ width: '100%', maxWidth: 360, alignItems: 'center' }}>
        <View style={[styles.iconWrap, { backgroundColor: t.negativeBg }]}>
          <Ionicons name="alert-circle-outline" size={26} color={t.danger} />
        </View>
        <AppText variant="titleSm" style={{ color: t.danger, textAlign: 'center' }}>
          Something went wrong
        </AppText>
        <AppText muted style={{ textAlign: 'center', marginTop: 6 }}>
          {message}
        </AppText>
        {onRetry ? (
          <Button title="Try again" onPress={onRetry} style={{ marginTop: 16, alignSelf: 'stretch' }} />
        ) : null}
      </Card>
    </View>
  );
  return framed ? <Screen>{body}</Screen> : body;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  compact: { alignItems: 'center', justifyContent: 'center', paddingVertical: 36 },
  pad: { padding: 24, gap: 6 },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  spinnerRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
