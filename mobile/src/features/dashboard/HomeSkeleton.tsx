import { StyleSheet, View } from 'react-native';
import { useThemeStore } from '@/src/stores/themeStore';

function Bone({ height, width, style }: { height: number; width?: number | `${number}%`; style?: object }) {
  const t = useThemeStore((s) => s.tokens);
  return (
    <View
      style={[
        {
          height,
          width: width ?? '100%',
          borderRadius: 12,
          backgroundColor: t.brand50,
          opacity: 0.85,
        },
        style,
      ]}
    />
  );
}

export function HomeSkeleton() {
  return (
    <View style={styles.wrap}>
      <Bone height={14} width="40%" />
      <Bone height={28} width="70%" style={{ marginTop: 8 }} />
      <Bone height={72} style={{ marginTop: 20, borderRadius: 16 }} />
      <View style={styles.row}>
        <Bone height={96} style={{ flex: 1, borderRadius: 16 }} />
        <Bone height={96} style={{ flex: 1, borderRadius: 16 }} />
      </View>
      <Bone height={44} style={{ marginTop: 8, borderRadius: 14 }} />
      <Bone height={160} style={{ marginTop: 16, borderRadius: 16 }} />
      <Bone height={160} style={{ marginTop: 16, borderRadius: 16 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 4 },
  row: { flexDirection: 'row', gap: 10, marginTop: 12 },
});
