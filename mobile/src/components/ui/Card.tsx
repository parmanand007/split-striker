import { Platform, Pressable, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useThemeStore } from '@/src/stores/themeStore';
import { motion, shadow } from '@/src/theme/tokens';

type Elevation = 'none' | 'sm' | 'md' | 'lg';

interface CardProps extends ViewProps {
  elevated?: Elevation;
  /** Soft glass treatment (auth / hero). Falls back on Android. */
  glass?: boolean;
  padded?: boolean;
  onPress?: () => void;
}

export function Card({
  style,
  elevated = 'sm',
  glass,
  padded = true,
  onPress,
  children,
  ...rest
}: CardProps) {
  const t = useThemeStore((s) => s.tokens);

  const showBorder = elevated === 'none' || glass;
  const baseStyle: ViewStyle[] = [
    styles.card,
    {
      backgroundColor: glass ? 'rgba(255,255,255,0.72)' : t.cardBg,
      borderColor: glass ? 'rgba(255,255,255,0.55)' : t.cardBorder,
      borderWidth: showBorder ? 1 : 0,
      borderRadius: t.radiusLg,
      padding: padded ? 16 : 0,
      ...shadow(elevated === 'none' ? 'none' : elevated),
    },
    style as ViewStyle,
  ];

  const content =
    glass && Platform.OS === 'ios' ? (
      <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFill} />
    ) : null;

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          ...baseStyle,
          { overflow: 'hidden', transform: [{ scale: pressed ? motion.pressScale : 1 }] },
        ]}
        {...rest}
      >
        {content}
        <View style={styles.foreground}>{children}</View>
      </Pressable>
    );
  }

  return (
    <View style={[...baseStyle, { overflow: 'hidden' }]} {...rest}>
      {content}
      <View style={styles.foreground}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {},
  foreground: {
    position: 'relative',
    zIndex: 1,
  },
});
