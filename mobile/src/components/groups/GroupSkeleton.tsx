import { StyleSheet, View } from 'react-native';
import { ShimmerBone } from '@/src/components/ui/Shimmer';
import { space } from '@/src/theme/tokens';

export function GroupListSkeleton() {
  return (
    <View style={styles.wrap} accessibilityLabel="Loading groups">
      <ShimmerBone height={28} width="45%" radius={10} />
      <ShimmerBone height={14} width="30%" radius={8} style={{ marginTop: 8 }} />
      {[0, 1, 2, 3].map((i) => (
        <ShimmerBone key={i} height={76} radius={18} style={{ marginTop: 12 }} />
      ))}
    </View>
  );
}

export function GroupDetailSkeleton() {
  return (
    <View style={styles.wrap} accessibilityLabel="Loading group">
      <ShimmerBone height={96} radius={20} />
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
        <ShimmerBone height={48} radius={14} style={{ flex: 1 }} />
        <ShimmerBone height={48} radius={14} style={{ flex: 1 }} />
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
        <ShimmerBone height={40} width={88} radius={12} />
        <ShimmerBone height={40} width={88} radius={12} />
        <ShimmerBone height={40} width={88} radius={12} />
      </View>
      <ShimmerBone height={220} radius={18} style={{ marginTop: 14 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: space.xs },
});
