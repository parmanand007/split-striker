import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/src/stores/themeStore';
import { CURRENCIES, findCurrency, type CurrencyOption } from '@/src/features/currency/currencies';
import { fonts } from '@/src/theme/typography';
import { AppText } from './AppText';
import { shadow } from '@/src/theme/tokens';
import { GlassBottomSheet } from './GlassBottomSheet';

interface Props {
  label?: string;
  value: string;
  onChange: (code: string) => void;
  error?: string;
  /** Extra codes that must appear even if not in the catalog (legacy data). */
  includeCodes?: string[];
  /** Small pill trigger (flag + code only) for inline placement next to a hero amount. */
  compact?: boolean;
}

export function CurrencyPicker({
  label = 'Currency',
  value,
  onChange,
  error,
  includeCodes = [],
  compact,
}: Props) {
  const t = useThemeStore((s) => s.tokens);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const options = useMemo(() => {
    const map = new Map<string, CurrencyOption>();
    for (const c of CURRENCIES) map.set(c.code, c);
    for (const code of includeCodes) {
      const upper = code.toUpperCase();
      if (!map.has(upper)) {
        map.set(upper, { code: upper, name: upper, flag: '💱' });
      }
    }
    return Array.from(map.values());
  }, [includeCodes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q),
    );
  }, [options, query]);

  const selected = findCurrency(value) ?? {
    code: value?.toUpperCase() || 'INR',
    name: value?.toUpperCase() || 'INR',
    flag: '💱',
  };

  return (
    <View>
      {label && !compact ? (
        <AppText muted variant="caption" style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Currency ${selected.code}`}
        onPress={() => setOpen(true)}
        style={[
          compact ? styles.pill : styles.trigger,
          shadow('sm'),
          {
            backgroundColor: compact ? t.brand50 : t.cardBg,
            borderColor: error ? t.danger : compact ? t.brand100 : t.cardBorder,
          },
        ]}
      >
        {compact ? (
          <>
            <AppText style={{ fontFamily: fonts.bold, color: t.brand700 }}>
              {selected.flag} {selected.code}
            </AppText>
            <Ionicons name="chevron-down" size={14} color={t.brand600} />
          </>
        ) : (
          <>
            <AppText style={{ flex: 1, fontFamily: fonts.semibold }} numberOfLines={1}>
              {selected.flag} {selected.code} — {selected.name}
            </AppText>
            <Ionicons name="chevron-down" size={18} color={t.textMuted} />
          </>
        )}
      </Pressable>
      {error ? (
        <AppText style={{ color: t.danger, marginTop: 4 }} variant="caption">
          {error}
        </AppText>
      ) : null}

      <GlassBottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Select currency"
        maxHeight={520}
      >
        <View
          style={[
            styles.search,
            { backgroundColor: t.pageBg, borderColor: t.cardBorder },
          ]}
        >
          <Ionicons name="search" size={16} color={t.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search code or name"
            placeholderTextColor={t.textMuted}
            autoCapitalize="none"
            style={[styles.searchInput, { color: t.text, fontFamily: fonts.regular }]}
          />
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.code}
          keyboardShouldPersistTaps="handled"
          style={{ maxHeight: 360 }}
          renderItem={({ item }) => {
            const active = item.code === selected.code;
            return (
              <Pressable
                onPress={() => {
                  onChange(item.code);
                  setOpen(false);
                  setQuery('');
                }}
                style={[
                  styles.row,
                  {
                    backgroundColor: active ? t.brand50 : 'transparent',
                    borderColor: active ? t.brand100 : 'transparent',
                  },
                ]}
              >
                <AppText style={{ flex: 1, fontFamily: fonts.semibold }}>
                  {item.flag} {item.code} — {item.name}
                </AppText>
                {active ? (
                  <Ionicons name="checkmark-circle" size={20} color={t.brand500} />
                ) : null}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <AppText muted style={{ padding: 16, textAlign: 'center' }}>
              No currencies match.
            </AppText>
          }
        />
      </GlassBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: 6, fontFamily: fonts.bold },
  trigger: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pill: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 44,
    marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 10 },
  row: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
});
