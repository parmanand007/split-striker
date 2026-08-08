import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '@/src/stores/themeStore';
import { avatarImageSource } from '@/src/api/avatar';
import { AppText } from './AppText';

/** Brand-adjacent only — no purple / neon SaaS colors. */
const PALETTE = [
  ['#be1240', '#9f0e30'],
  ['#e63c50', '#be1240'],
  ['#c2410c', '#9a3412'],
  ['#0f766e', '#115e59'],
  ['#b45309', '#92400e'],
  ['#9f0e30', '#680a1e'],
];

function hashColor(seed: string | number) {
  const n = typeof seed === 'number' ? seed : [...String(seed)].reduce((a, c) => a + c.charCodeAt(0), 0);
  return PALETTE[Math.abs(n) % PALETTE.length];
}

export function Avatar({
  name,
  seed,
  size = 40,
  avatarUrl,
  shape = 'rounded',
}: {
  name?: string | null;
  seed?: string | number;
  size?: number;
  avatarUrl?: string | null;
  shape?: 'rounded' | 'circle';
}) {
  const t = useThemeStore((s) => s.tokens);
  const initial = (name || '?').trim().slice(0, 1).toUpperCase() || '?';
  const [a, b] = hashColor(seed ?? name ?? '?');
  const radius = shape === 'circle' ? size / 2 : size * 0.32;
  const imageSource = avatarImageSource(avatarUrl);

  if (imageSource) {
    return (
      <View
        style={[
          styles.av,
          {
            width: size,
            height: size,
            borderRadius: radius,
            borderColor: t.cardBg,
          },
        ]}
      >
        <Image
          source={imageSource}
          style={{ width: size, height: size, borderRadius: radius }}
          accessibilityLabel={name ? `${name} profile photo` : 'Profile photo'}
        />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[a, b]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.av,
        {
          width: size,
          height: size,
          borderRadius: radius,
          borderColor: t.cardBg,
        },
      ]}
    >
      <View style={styles.spec} />
      <AppText
        variant="titleSm"
        inverse
        style={{ fontSize: size * 0.38, lineHeight: size * 0.42 }}
      >
        {initial}
      </AppText>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  av: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
  },
  spec: {
    position: 'absolute',
    top: 2,
    left: 3,
    right: '40%',
    height: '40%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
});
