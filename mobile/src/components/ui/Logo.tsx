import { StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { MARKETING } from '@/src/theme/themes';
import { fonts } from '@/src/theme/typography';
import { AppText, Sparkle } from './AppText';
import { shadow } from '@/src/theme/tokens';

type Size = 'sm' | 'md' | 'lg' | 'hero';

const SIZES: Record<Size, { box: number; icon: number; radius: number }> = {
  sm: { box: 32, icon: 16, radius: 10 },
  md: { box: 44, icon: 20, radius: 14 },
  lg: { box: 56, icon: 26, radius: 18 },
  hero: { box: 72, icon: 34, radius: 22 },
};

/**
 * Split Striker mark — bolt + split highlight.
 * Purely visual; used on auth, splash, empty states.
 */
export function LogoMark({
  size = 'md',
  sparkle,
  style,
}: {
  size?: Size;
  sparkle?: boolean;
  style?: ViewStyle;
}) {
  const s = SIZES[size];
  return (
    <View style={[styles.wrap, style]}>
      <LinearGradient
        colors={[MARKETING.brand800, MARKETING.brand600, MARKETING.accentSoft]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.mark,
          {
            width: s.box,
            height: s.box,
            borderRadius: s.radius,
          },
          shadow('glow'),
        ]}
      >
        {/* Specular highlight */}
        <View style={styles.spec} />
        <Ionicons name="flash" size={s.icon} color="#fff" />
        {/* Subtle “split” notch */}
        <View style={styles.split} />
      </LinearGradient>
      {sparkle ? (
        <>
          <View style={[styles.spark, { top: -2, right: -4 }]}>
            <Sparkle color={MARKETING.accentBright} />
          </View>
          <View style={[styles.spark, { bottom: 0, left: -6 }]}>
            <Sparkle color="#fbbf24" />
          </View>
        </>
      ) : null}
    </View>
  );
}

export function LogoWordmark({
  size = 'md',
  subtitle,
  light = true,
}: {
  size?: Size;
  subtitle?: string;
  light?: boolean;
}) {
  const titleSize = size === 'hero' ? 24 : size === 'lg' ? 20 : 16;
  return (
    <View style={styles.row}>
      <LogoMark size={size} sparkle={size === 'hero'} />
      <View style={{ flexShrink: 1 }}>
        <AppText
          variant="titleSm"
          style={{
            fontSize: titleSize,
            color: light ? '#fff' : undefined,
            fontFamily: fonts.extrabold,
          }}
        >
          Split Striker Wise
        </AppText>
        {subtitle ? (
          <AppText
            variant="caption"
            muted={!light}
            style={{ color: light ? MARKETING.textMuted : undefined, marginTop: 2 }}
          >
            {subtitle}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  mark: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  spec: {
    position: 'absolute',
    top: 3,
    left: 4,
    right: '35%',
    height: '38%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  split: {
    position: 'absolute',
    right: -2,
    top: '38%',
    width: 10,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.55)',
    transform: [{ rotate: '-28deg' }],
  },
  spark: { position: 'absolute' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
