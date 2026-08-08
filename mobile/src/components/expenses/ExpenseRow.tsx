import { Pressable, StyleSheet, View } from 'react-native';
import type { Expense, User } from '@/src/types/api';
import { formatMoney } from '@/src/utils/format';
import { useThemeStore } from '@/src/stores/themeStore';
import { useAuthStore } from '@/src/stores/authStore';
import { AppText } from '@/src/components/ui/AppText';
import { Badge } from '@/src/components/ui/Badge';
import { CategoryIcon } from '@/src/components/expenses/CategoryIcon';
import { motion, shadow } from '@/src/theme/tokens';

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
        {
          borderColor: t.cardBorder,
          backgroundColor: t.cardBg,
          opacity: pressed ? 0.94 : 1,
          transform: [{ scale: pressed ? motion.pressScale : 1 }],
          ...shadow('sm'),
        },
      ]}
    >
      <CategoryIcon category={expense.category} size={40} />
      <View style={{ flex: 1, gap: 3 }}>
        <View style={styles.titleRow}>
          <AppText variant="body" numberOfLines={1} style={{ fontWeight: '600', flexShrink: 1 }}>
            {expense.description}
          </AppText>
          {expense.is_negative ? <Badge label="REFUND" tone="warning" /> : null}
        </View>
        <AppText muted variant="caption" numberOfLines={1}>
          {payer ? `${payer.name} paid` : 'Paid'}
          {expense.category ? ` · ${expense.category}` : ' · Uncategorized'}
          {` · ${expense.date}`}
        </AppText>
        {user && Math.abs(myShare) > 0.005 ? (
          <AppText muted variant="caption">
            Your share {formatMoney(String(myShare), currency)}
          </AppText>
        ) : null}
      </View>
      <AppText
        variant="money"
        style={{
          fontSize: 15,
          color: expense.is_negative ? t.positive : t.text,
        }}
      >
        {formatMoney(expense.total_amount, currency)}
      </AppText>
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
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 74,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
