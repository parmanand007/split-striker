import { StyleSheet, View } from 'react-native';
import { useThemeStore } from '@/src/stores/themeStore';

function Bone({ h, w, style }: { h: number; w?: number | `${number}%`; style?: object }) {
  const t = useThemeStore((s) => s.tokens);
  return (
    <View
      style={[
        { height: h, width: w ?? '100%', borderRadius: 12, backgroundColor: t.brand50 },
        style,
      ]}
    />
  );
}

export function GroupListSkeleton() {
  return (
    <View style={styles.wrap}>
      <Bone h={28} w="45%" />
      {[0, 1, 2].map((i) => (
        <Bone key={i} h={72} style={{ marginTop: 12, borderRadius: 16 }} />
      ))}
    </View>
  );
}

export function GroupDetailSkeleton() {
  return (
    <View style={styles.wrap}>
      <Bone h={80} style={{ borderRadius: 16 }} />
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
        <Bone h={48} style={{ flex: 1 }} />
        <Bone h={48} style={{ flex: 1 }} />
      </View>
      <Bone h={40} style={{ marginTop: 12 }} />
      <Bone h={200} style={{ marginTop: 12, borderRadius: 16 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16 },
});
