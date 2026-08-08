import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Expense, User } from '@/src/types/api';
import { formatMoney } from '@/src/utils/format';
import { useThemeStore } from '@/src/stores/themeStore';
import { useAuthStore } from '@/src/stores/authStore';

interface Props {
  expense: Expense;
  members: User[];
  currency: string;
  onPress: () => void;
}

export function ExpenseRow({ expense, members, currency, onPress }: Props) {
  const t = useThemeStore((s) => s.tokens);
  const user = useAuthStore((s) => s.user);
  const payerId = Object.keys(expense.paid_by)[0];
  const payer = members.find((m) => String(m.id) === payerId);
  const myShare = Number(expense.split_amounts[String(user?.id)] || 0);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.row,
        { borderColor: t.cardBorder, backgroundColor: t.cardBg, opacity: pressed ? 0.92 : 1 },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: t.brand100 }]}>
        <Text style={{ color: t.brand600, fontWeight: '700' }}>
          {(expense.category || expense.description).slice(0, 1).toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: t.text }]} numberOfLines={1}>
            {expense.description}
          </Text>
          {expense.is_negative ? (
            <Text style={[styles.badge, { color: '#b45309', backgroundColor: '#fef3c7' }]}>
              REFUND
            </Text>
          ) : null}
        </View>
        <Text style={{ color: t.textMuted, fontSize: 12 }} numberOfLines={1}>
          {payer ? `${payer.name} paid` : 'Paid'}
          {expense.category ? ` · ${expense.category}` : ''}
          {` · ${expense.date}`}
        </Text>
        {user && Math.abs(myShare) > 0.005 ? (
          <Text style={{ color: t.textMuted, fontSize: 11 }}>
            Your share {formatMoney(String(myShare), currency)}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.amount, { color: expense.is_negative ? t.positive : t.text }]}>
        {formatMoney(expense.total_amount, currency)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 72,
  },
  dot: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  amount: { fontSize: 15, fontWeight: '700' },
  badge: {
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
});
