import { StyleSheet, View } from 'react-native';
import { ShimmerBone } from '@/src/components/ui/Shimmer';

export function HomeSkeleton() {
  return (
    <View style={styles.wrap} accessibilityLabel="Loading home">
      <View style={styles.header}>
        <ShimmerBone height={44} width={44} radius={14} />
        <View style={{ flex: 1, gap: 8 }}>
          <ShimmerBone height={12} width="40%" radius={8} />
          <ShimmerBone height={22} width="65%" radius={8} />
        </View>
        <ShimmerBone height={54} width={96} radius={14} />
      </View>
      <View style={styles.row}>
        <ShimmerBone height={96} radius={18} style={{ flex: 1 }} />
        <ShimmerBone height={96} radius={18} style={{ flex: 1 }} />
      </View>
      <View style={styles.actions}>
        {[0, 1, 2, 3].map((i) => (
          <ShimmerBone key={i} height={68} radius={14} style={{ flex: 1 }} />
        ))}
      </View>
      <ShimmerBone height={18} width="30%" radius={8} style={{ marginTop: 8 }} />
      <ShimmerBone height={140} radius={18} style={{ marginTop: 10 }} />
      <ShimmerBone height={18} width="40%" radius={8} style={{ marginTop: 16 }} />
      <ShimmerBone height={100} radius={18} style={{ marginTop: 10 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 2, paddingTop: 4 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  row: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
});
