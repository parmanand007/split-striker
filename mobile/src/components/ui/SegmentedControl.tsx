import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useThemeStore } from '@/src/stores/themeStore';
import { fonts } from '@/src/theme/typography';
import { AppText } from './AppText';

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
}) {
  const t = useThemeStore((s) => s.tokens);

  return (
    <View style={[styles.track, { backgroundColor: t.brand50, borderColor: t.cardBorder }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {options.map((opt) => {
          const selected = value === opt.key;
          return (
            <Pressable
              key={opt.key}
              onPress={() => onChange(opt.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={`${opt.label} tab`}
              style={[
                styles.item,
                selected && {
                  backgroundColor: t.cardBg,
                  borderColor: t.cardBorder,
                },
              ]}
            >
              <AppText
                style={{
                  color: selected ? t.brand700 : t.textMuted,
                  fontFamily: selected ? fonts.bold : fonts.semibold,
                  fontSize: 13,
                  textTransform: 'capitalize',
                }}
              >
                {opt.label}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 14,
    padding: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  item: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
});
