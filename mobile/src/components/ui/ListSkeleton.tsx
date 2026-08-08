import { StyleSheet, View } from 'react-native';
import { ShimmerBone } from './Shimmer';

/** Generic list shimmer for activity / friends / expense lists. */
export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <View style={styles.wrap} accessibilityLabel="Loading">
      <ShimmerBone height={28} width="40%" radius={10} />
      <ShimmerBone height={14} width="55%" radius={8} style={{ marginTop: 8 }} />
      {Array.from({ length: rows }).map((_, i) => (
        <ShimmerBone key={i} height={64} radius={16} style={{ marginTop: 12 }} />
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { paddingVertical: 4 },
});
