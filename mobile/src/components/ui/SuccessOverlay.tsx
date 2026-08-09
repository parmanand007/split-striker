import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/src/stores/themeStore';
import { AppText } from './AppText';

/**
 * Brief celebratory confirmation for high-value moments (expense added,
 * settlement recorded). Auto-dismisses via onDone — keep usage sparse.
 */
export function SuccessOverlay({ label, onDone }: { label: string; onDone: () => void }) {
  const t = useThemeStore((s) => s.tokens);
  const scale = useSharedValue(0.85);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) }),
      withDelay(650, withTiming(0, { duration: 200 }, (finished) => {
        if (finished) runOnJS(onDone)();
      })),
    );
    scale.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.back(1.6)) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.wrap} pointerEvents="none">
      <Animated.View
        style={[styles.card, cardStyle, { backgroundColor: t.cardBg }]}
        accessibilityLabel={label}
      >
        <View style={[styles.badge, { backgroundColor: t.positive }]}>
          <Ionicons name="checkmark" size={26} color="#fff" />
        </View>
        <AppText style={{ fontFamily: 'Inter_700Bold', marginTop: 10 }}>{label}</AppText>
        <AppText muted variant="caption" style={{ marginTop: 2 }}>
          ✦
        </AppText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  card: {
    minWidth: 160,
    paddingVertical: 24,
    paddingHorizontal: 28,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  badge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
