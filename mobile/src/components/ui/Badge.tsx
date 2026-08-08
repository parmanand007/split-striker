import { StyleSheet, View, ViewStyle } from 'react-native';
import { useThemeStore } from '@/src/stores/themeStore';
import { AppText } from './AppText';

type Tone = 'neutral' | 'positive' | 'negative' | 'brand' | 'warning';

export function Badge({
  label,
  tone = 'neutral',
  style,
}: {
  label: string;
  tone?: Tone;
  style?: ViewStyle;
}) {
  const t = useThemeStore((s) => s.tokens);
  const map = {
    neutral: { bg: '#f1f5f9', fg: t.textMuted, border: '#e2e8f0' },
    positive: { bg: t.positiveBg, fg: t.positive, border: t.positiveBg },
    negative: { bg: t.negativeBg, fg: t.negative, border: t.negativeBg },
    brand: { bg: t.brand50, fg: t.brand600, border: t.brand100 },
    warning: { bg: '#fef3c7', fg: '#b45309', border: '#fde68a' },
  }[tone];

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: map.bg, borderColor: map.border },
        style,
      ]}
    >
      <AppText variant="overline" style={{ color: map.fg, letterSpacing: 0.4 }}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
});
