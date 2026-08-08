import { StyleSheet, Text, View } from 'react-native';
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
  const t = useThemeStore((s) => s.tokens);
  return (
    <View style={styles.wrap} accessibilityLabel="Loading home">
      <Text style={{ color: t.textMuted, fontWeight: '600', marginBottom: 8 }}>Loading home…</Text>
      <Bone height={14} width="40%" />
      <Bone height={28} width="70%" style={{ marginTop: 8 }} />
      <View style={styles.row}>
        <Bone height={88} style={{ flex: 1, borderRadius: 16 }} />
        <Bone height={88} style={{ flex: 1, borderRadius: 16 }} />
      </View>
      <Bone height={64} style={{ marginTop: 8, borderRadius: 14 }} />
      <Bone height={120} style={{ marginTop: 12, borderRadius: 16 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 4, paddingTop: 4, gap: 4 },
  row: { flexDirection: 'row', gap: 8, marginTop: 12 },
});
