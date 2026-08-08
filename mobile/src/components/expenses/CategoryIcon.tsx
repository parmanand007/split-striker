import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCategoryMeta } from '@/src/features/expenses/categoryMeta';
import { AppText } from '@/src/components/ui/AppText';
import { fonts } from '@/src/theme/typography';

export function CategoryIcon({
  category,
  size = 40,
}: {
  category?: string | null;
  size?: number;
}) {
  const meta = getCategoryMeta(category);
  const iconSize = Math.round(size * 0.45);
  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size * 0.28,
          backgroundColor: meta.tint,
        },
      ]}
      accessibilityLabel={category || 'Uncategorized'}
    >
      <Ionicons name={meta.icon} size={iconSize} color={meta.fg} />
    </View>
  );
}

export function CategoryLabel({
  category,
  size = 36,
}: {
  category?: string | null;
  size?: number;
}) {
  if (!category) {
    return (
      <View style={styles.row}>
        <CategoryIcon category={null} size={size} />
        <AppText muted variant="bodySm" style={{ fontFamily: fonts.semibold }}>
          Uncategorized
        </AppText>
      </View>
    );
  }
  return (
    <View style={styles.row}>
      <CategoryIcon category={category} size={size} />
      <AppText variant="bodySm" style={{ fontFamily: fonts.semibold }}>
        {category}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
