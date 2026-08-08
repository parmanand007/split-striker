import { Text, TextProps, StyleSheet } from 'react-native';
import { useThemeStore } from '@/src/stores/themeStore';
import { TextVariant, textStyle } from '@/src/theme/typography';

interface Props extends TextProps {
  variant?: TextVariant;
  muted?: boolean;
  inverse?: boolean;
  color?: string;
}

export function AppText({
  variant = 'body',
  muted,
  inverse,
  color,
  style,
  ...rest
}: Props) {
  const t = useThemeStore((s) => s.tokens);
  const resolved =
    color ?? (inverse ? t.textInverse : muted ? t.textMuted : t.text);

  return (
    <Text
      style={[textStyle(variant), { color: resolved }, style]}
      {...rest}
    />
  );
}

/** Tiny sparkle glyph for premium accents — keep sparse. */
export function Sparkle({ color }: { color?: string }) {
  const t = useThemeStore((s) => s.tokens);
  return (
    <AppText
      variant="caption"
      style={[styles.sparkle, { color: color ?? t.brand400 }]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      ✦
    </AppText>
  );
}

const styles = StyleSheet.create({
  sparkle: { fontSize: 10, opacity: 0.85 },
});
