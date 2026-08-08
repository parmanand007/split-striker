import { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useThemeStore } from '@/src/stores/themeStore';
import { LinearGradient } from 'expo-linear-gradient';

export function ShimmerBone({
  height,
  width = '100%',
  radius = 12,
  style,
}: {
  height: number;
  width?: number | `${number}%`;
  radius?: number;
  style?: ViewStyle;
}) {
  const t = useThemeStore((s) => s.tokens);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
  }, [progress]);

  const shine = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(progress.value, [0, 1], [-80, 220]),
      },
    ],
  }));

  return (
    <View
      style={[
        {
          height,
          width,
          borderRadius: radius,
          backgroundColor: t.brand50,
          overflow: 'hidden',
          opacity: 0.95,
        },
        style,
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, shine]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.55)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ width: 80, height: '100%' }}
        />
      </Animated.View>
    </View>
  );
}
