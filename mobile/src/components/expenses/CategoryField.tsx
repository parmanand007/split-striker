import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/src/stores/themeStore';
import { GlassBottomSheet } from '@/src/components/ui/GlassBottomSheet';
import { AppText } from '@/src/components/ui/AppText';
import { CategoryIcon } from './CategoryIcon';
import { EXPENSE_CATEGORIES } from '@/src/features/expenses/constants';
import { getCategoryMeta } from '@/src/features/expenses/categoryMeta';
import { fonts } from '@/src/theme/typography';
import { shadow } from '@/src/theme/tokens';

interface Props {
  value: string;
  onChange: (category: string) => void;
}

/** iOS-style row trigger + grid bottom sheet for expense category selection. */
export function CategoryField({ value, onChange }: Props) {
  const t = useThemeStore((s) => s.tokens);
  const [open, setOpen] = useState(false);
  const meta = getCategoryMeta(value || null);

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Category ${value || 'Uncategorized'}`}
        onPress={() => setOpen(true)}
        style={[
          styles.trigger,
          shadow('sm'),
          { backgroundColor: t.cardBg, borderColor: t.cardBorder },
        ]}
      >
        <CategoryIcon category={value || null} size={36} />
        <AppText style={{ flex: 1, fontFamily: fonts.semibold }} numberOfLines={1}>
          {value || 'Uncategorized'}
        </AppText>
        <Ionicons name="chevron-down" size={18} color={t.textMuted} />
      </Pressable>

      <GlassBottomSheet visible={open} onClose={() => setOpen(false)} title="Category">
        <View style={styles.grid}>
          <CategoryTile
            label="None"
            icon={meta.icon}
            selected={!value}
            onPress={() => {
              onChange('');
              setOpen(false);
            }}
          />
          {EXPENSE_CATEGORIES.map((c) => (
            <CategoryTile
              key={c}
              label={c}
              category={c}
              selected={value === c}
              onPress={() => {
                onChange(c);
                setOpen(false);
              }}
            />
          ))}
        </View>
      </GlassBottomSheet>
    </View>
  );
}

function CategoryTile({
  label,
  category,
  icon,
  selected,
  onPress,
}: {
  label: string;
  category?: string | null;
  icon?: ReturnType<typeof getCategoryMeta>['icon'];
  selected: boolean;
  onPress: () => void;
}) {
  const t = useThemeStore((s) => s.tokens);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.tile,
        {
          backgroundColor: selected ? t.brand50 : t.pageBg,
          borderColor: selected ? t.brand500 : t.cardBorder,
        },
      ]}
    >
      {category !== undefined ? (
        <CategoryIcon category={category} size={40} />
      ) : (
        <View
          style={[
            styles.noneIcon,
            { backgroundColor: t.cardBorder },
          ]}
        >
          <Ionicons name={icon ?? 'pricetag-outline'} size={18} color={t.textMuted} />
        </View>
      )}
      <AppText
        variant="caption"
        numberOfLines={1}
        style={{
          fontFamily: fonts.semibold,
          color: selected ? t.brand700 : t.text,
        }}
      >
        {label}
      </AppText>
      {selected ? (
        <View style={[styles.check, { backgroundColor: t.brand500 }]}>
          <Ionicons name="checkmark" size={10} color="#fff" />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: 56,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 8,
  },
  tile: {
    width: '31%',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 6,
  },
  noneIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
