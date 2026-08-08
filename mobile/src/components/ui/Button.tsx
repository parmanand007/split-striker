import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '@/src/stores/themeStore';
import { MARKETING } from '@/src/theme/themes';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'marketing';

interface Props {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  style,
}: Props) {
  const t = useThemeStore((s) => s.tokens);
  const isDisabled = disabled || loading;

  if (variant === 'marketing') {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.base,
          {
            borderRadius: 16, // web auth: rounded-2xl
            opacity: isDisabled ? 0.4 : pressed ? 0.92 : 1,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          },
          style,
        ]}
      >
        <LinearGradient
          colors={[MARKETING.brand600, MARKETING.brand800]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradientFill, { borderRadius: 16 }]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[styles.label, { color: '#fff', fontFamily: 'Inter_700Bold' }]}>
              {title}
            </Text>
          )}
        </LinearGradient>
      </Pressable>
    );
  }

  const bg =
    variant === 'primary'
      ? t.brand500
      : variant === 'danger'
        ? t.negative
        : variant === 'secondary'
          ? t.cardBg
          : 'transparent';

  const color =
    variant === 'primary'
      ? t.btnPrimaryText
      : variant === 'danger'
        ? '#fff'
        : variant === 'ghost'
          ? t.textMuted
          : t.text;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles.solid,
        {
          backgroundColor: bg,
          borderColor: variant === 'secondary' ? t.cardBorder : 'transparent',
          borderWidth: variant === 'secondary' ? 1 : 0,
          borderRadius: t.radiusSm, // web .btn-*: rounded-xl
          opacity: isDisabled ? 0.45 : pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text style={[styles.label, { color, fontFamily: 'Inter_700Bold' }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    overflow: 'hidden',
  },
  solid: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  gradientFill: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
  },
});
