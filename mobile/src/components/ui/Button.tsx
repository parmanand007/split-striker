import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useThemeStore } from '@/src/stores/themeStore';
import { MARKETING } from '@/src/theme/themes';
import { fonts } from '@/src/theme/typography';
import { motion, shadow } from '@/src/theme/tokens';
import { AppText } from './AppText';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'marketing';

interface Props {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
  /** When false, button is content-width centered (max ~320px). Default true. */
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  style,
  testID,
  fullWidth = true,
}: Props) {
  const t = useThemeStore((s) => s.tokens);
  const isDisabled = disabled || loading;
  const widthStyle: ViewStyle = fullWidth
    ? { alignSelf: 'stretch' }
    : { alignSelf: 'center', width: '100%', maxWidth: 320, minWidth: 200 };

  const handlePress = () => {
    if (isDisabled || !onPress) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    onPress();
  };

  if (variant === 'marketing') {
    return (
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={title}
        onPress={handlePress}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.base,
          shadow('glow'),
          widthStyle,
          {
            borderRadius: t.radiusMd,
            opacity: isDisabled ? 0.4 : pressed ? 0.94 : 1,
            transform: [{ scale: pressed ? motion.pressScale : 1 }],
          },
          style,
        ]}
      >
        <LinearGradient
          colors={[MARKETING.accentSoft, MARKETING.brand600, MARKETING.brand800]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientFill, { borderRadius: t.radiusMd }]}
        >
          <ViewHighlight />
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <AppText variant="body" style={[styles.label, { color: '#fff' }]}>
              {title}
            </AppText>
          )}
        </LinearGradient>
      </Pressable>
    );
  }

  if (variant === 'primary') {
    return (
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={title}
        onPress={handlePress}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.base,
          shadow('sm'),
          widthStyle,
          {
            borderRadius: t.radiusMd,
            opacity: isDisabled ? 0.45 : pressed ? 0.92 : 1,
            transform: [{ scale: pressed ? motion.pressScale : 1 }],
          },
          style,
        ]}
      >
        <LinearGradient
          colors={[t.brand400, t.brand500, t.brand600]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientFill, { borderRadius: t.radiusMd }]}
        >
          <ViewHighlight />
          {loading ? (
            <ActivityIndicator color={t.btnPrimaryText} />
          ) : (
            <AppText
              variant="body"
              style={[styles.label, { color: t.btnPrimaryText }]}
            >
              {title}
            </AppText>
          )}
        </LinearGradient>
      </Pressable>
    );
  }

  const bg =
    variant === 'danger' ? t.negative : variant === 'secondary' ? t.cardBg : 'transparent';
  const color =
    variant === 'danger' ? '#fff' : variant === 'ghost' ? t.textMuted : t.text;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={handlePress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles.solid,
        widthStyle,
        {
          backgroundColor: bg,
          borderColor: variant === 'secondary' ? t.cardBorder : 'transparent',
          borderWidth: variant === 'secondary' ? 1 : 0,
          borderRadius: t.radiusMd,
          opacity: isDisabled ? 0.45 : pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? motion.pressScale : 1 }],
          ...(variant === 'secondary' ? shadow('sm') : null),
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <AppText variant="body" style={[styles.label, { color }]}>
          {title}
        </AppText>
      )}
    </Pressable>
  );
}

function ViewHighlight() {
  return <LinearGradient
    colors={['rgba(255,255,255,0.28)', 'transparent']}
    style={styles.highlight}
    pointerEvents="none"
  />;
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    overflow: 'hidden',
  },
  solid: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  gradientFill: {
    flex: 1,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
  },
  label: {
    fontSize: 15,
    fontFamily: fonts.bold,
  },
});
