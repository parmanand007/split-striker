import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { useThemeStore } from '@/src/stores/themeStore';
import { GlassBottomSheet } from '@/src/components/ui/GlassBottomSheet';
import { AppText } from '@/src/components/ui/AppText';
import { fonts } from '@/src/theme/typography';
import { shadow } from '@/src/theme/tokens';
import { shiftISODate } from '@/src/features/expenses/validation';
import { todayISO } from '@/src/utils/format';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface Props {
  value: string;
  onChange: (isoDate: string) => void;
}

/** iOS-style row trigger + calendar bottom sheet for the expense date. */
export function DateField({ value, onChange }: Props) {
  const t = useThemeStore((s) => s.tokens);
  const [open, setOpen] = useState(false);
  const selectedDate = useMemo(() => parseISO(`${value}T12:00:00`), [value]);
  const [cursor, setCursor] = useState(selectedDate);

  const today = todayISO();
  const yesterday = shiftISODate(today, -1);

  const openSheet = () => {
    setCursor(selectedDate);
    setOpen(true);
  };

  const pick = (iso: string) => {
    onChange(iso);
    setOpen(false);
  };

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor));
    const end = endOfWeek(endOfMonth(cursor));
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const now = new Date();

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Date ${format(selectedDate, 'MMMM d, yyyy')}`}
        onPress={openSheet}
        style={[
          styles.trigger,
          shadow('sm'),
          { backgroundColor: t.cardBg, borderColor: t.cardBorder },
        ]}
      >
        <View style={[styles.icon, { backgroundColor: t.brand50 }]}>
          <Ionicons name="calendar-outline" size={18} color={t.brand600} />
        </View>
        <AppText style={{ flex: 1, fontFamily: fonts.semibold }}>
          {isSameDay(selectedDate, now)
            ? 'Today'
            : isSameDay(selectedDate, parseISO(`${yesterday}T12:00:00`))
              ? 'Yesterday'
              : format(selectedDate, 'EEE, MMM d, yyyy')}
        </AppText>
        <Ionicons name="chevron-down" size={18} color={t.textMuted} />
      </Pressable>

      <GlassBottomSheet visible={open} onClose={() => setOpen(false)} title="Date">
        <View style={styles.quickRow}>
          <QuickChip label="Today" active={value === today} onPress={() => pick(today)} />
          <QuickChip
            label="Yesterday"
            active={value === yesterday}
            onPress={() => pick(yesterday)}
          />
        </View>

        <View style={styles.monthHeader}>
          <Pressable
            hitSlop={8}
            onPress={() => setCursor((c) => subMonths(c, 1))}
            accessibilityLabel="Previous month"
          >
            <Ionicons name="chevron-back" size={20} color={t.text} />
          </Pressable>
          <AppText style={{ fontFamily: fonts.bold, fontSize: 15 }}>
            {format(cursor, 'MMMM yyyy')}
          </AppText>
          <Pressable
            hitSlop={8}
            onPress={() => setCursor((c) => addMonths(c, 1))}
            accessibilityLabel="Next month"
          >
            <Ionicons name="chevron-forward" size={20} color={t.text} />
          </Pressable>
        </View>

        <View style={styles.weekRow}>
          {WEEKDAY_LABELS.map((w, i) => (
            <AppText key={`${w}-${i}`} muted variant="caption" style={styles.weekLabel}>
              {w}
            </AppText>
          ))}
        </View>

        <View style={styles.grid}>
          {days.map((d) => {
            const iso = format(d, 'yyyy-MM-dd');
            const inMonth = isSameMonth(d, cursor);
            const isSelected = isSameDay(d, selectedDate);
            const isToday = isSameDay(d, now);
            const future = isAfter(d, now) && !isToday;
            return (
              <Pressable
                key={iso}
                disabled={future}
                onPress={() => pick(iso)}
                style={[
                  styles.day,
                  isSelected && { backgroundColor: t.brand500 },
                  !isSelected && isToday && { borderWidth: 1.5, borderColor: t.brand500 },
                ]}
              >
                <AppText
                  variant="bodySm"
                  style={{
                    fontFamily: isSelected || isToday ? fonts.bold : fonts.regular,
                    color: isSelected
                      ? t.btnPrimaryText
                      : !inMonth || future
                        ? t.textMuted
                        : t.text,
                    opacity: !inMonth ? 0.4 : future ? 0.35 : 1,
                  }}
                >
                  {format(d, 'd')}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </GlassBottomSheet>
    </View>
  );
}

function QuickChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const t = useThemeStore((s) => s.tokens);
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? t.brand500 : t.pageBg,
          borderColor: active ? t.brand500 : t.cardBorder,
        },
      ]}
    >
      <AppText
        variant="bodySm"
        style={{ fontFamily: fonts.bold, color: active ? t.btnPrimaryText : t.text }}
      >
        {label}
      </AppText>
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
  icon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  chip: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekLabel: { width: `${100 / 7}%`, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingBottom: 8 },
  day: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    maxHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
  },
});
