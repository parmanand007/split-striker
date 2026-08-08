import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Expense, Group } from '@/src/types/api';
import { useThemeStore } from '@/src/stores/themeStore';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { AppText } from '@/src/components/ui/AppText';
import { CategoryIcon } from '@/src/components/expenses/CategoryIcon';
import {
  budgetProgress,
  computeCategorySpent,
  computeGroupSpent,
  orderedCategoryKeys,
} from '@/src/features/budget/compute';
import { formatMoney } from '@/src/utils/format';
import { fonts } from '@/src/theme/typography';

export function TripBudgetCard({
  group,
  expenses,
  onEdit,
}: {
  group: Group;
  expenses: Expense[];
  onEdit?: () => void;
}) {
  const t = useThemeStore((s) => s.tokens);
  const budget = group.budget != null ? Number(group.budget) : null;
  const spent = computeGroupSpent(expenses);
  const categorySpent = computeCategorySpent(expenses);
  const catKeys = orderedCategoryKeys(categorySpent, group.category_budgets);

  if (budget == null || !Number.isFinite(budget)) {
    return (
      <Card elevated="sm" style={{ marginBottom: 12, gap: 10 }}>
        <AppText variant="overline" muted>
          Trip budget
        </AppText>
        <AppText muted variant="bodySm">
          Optional. Set a total budget to track planned vs spent for this group.
        </AppText>
        {onEdit ? (
          <Button title="Set budget" variant="secondary" onPress={onEdit} />
        ) : null}
      </Card>
    );
  }

  const prog = budgetProgress(budget, spent);
  const barColor = prog.exceeded ? t.negative : t.brand500;

  return (
    <Card elevated="md" padded={false} style={{ marginBottom: 12 }}>
      <LinearGradient
        colors={[t.brand50, t.cardBg]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.pad}
      >
        <View style={styles.header}>
          <AppText variant="overline" muted>
            Trip budget
          </AppText>
          {onEdit ? (
            <Button title="Edit" variant="ghost" onPress={onEdit} style={styles.editBtn} />
          ) : null}
        </View>

        <View style={styles.stats}>
          <Stat label="Total" value={formatMoney(budget, group.currency)} />
          <Stat label="Spent" value={formatMoney(spent, group.currency)} />
          <Stat
            label={prog.exceeded ? 'Over budget' : 'Remaining'}
            value={formatMoney(prog.exceeded ? prog.over : prog.remaining, group.currency)}
            tone={prog.exceeded ? t.negative : t.positive}
          />
        </View>

        <View style={[styles.track, { backgroundColor: t.brand100 }]}>
          <View
            style={[
              styles.fill,
              {
                width: `${prog.exceeded ? 100 : prog.pct}%`,
                backgroundColor: barColor,
              },
            ]}
          />
        </View>
        <AppText muted variant="caption" style={{ marginTop: 6 }}>
          {prog.exceeded
            ? `Over by ${formatMoney(prog.over, group.currency)}`
            : `${Math.round(prog.pct)}% of budget used`}
        </AppText>

        {catKeys.length > 0 ? (
          <View style={{ marginTop: 14, gap: 10 }}>
            <AppText variant="caption" style={{ fontFamily: fonts.bold }}>
              Category breakdown
            </AppText>
            {catKeys.map((key) => {
              const spentAmt = categorySpent[key] || 0;
              const catBudget = group.category_budgets?.[key];
              const limit = catBudget != null ? Number(catBudget) : null;
              return (
                <View key={key} style={styles.catRow}>
                  <CategoryIcon category={key} size={32} />
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodySm" style={{ fontFamily: fonts.semibold }}>
                      {key}
                    </AppText>
                    <AppText muted variant="caption">
                      {limit != null && Number.isFinite(limit)
                        ? `${formatMoney(spentAmt, group.currency)} / ${formatMoney(limit, group.currency)}`
                        : formatMoney(spentAmt, group.currency)}
                    </AppText>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}
      </LinearGradient>
    </Card>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  const t = useThemeStore((s) => s.tokens);
  return (
    <View style={{ flex: 1 }}>
      <AppText muted variant="caption">
        {label}
      </AppText>
      <AppText
        variant="bodySm"
        style={{ fontFamily: fonts.bold, color: tone || t.text, marginTop: 2 }}
        numberOfLines={1}
      >
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  editBtn: { minHeight: 36, paddingHorizontal: 10 },
  stats: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  track: { height: 8, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
