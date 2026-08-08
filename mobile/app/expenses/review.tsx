import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { getGroups } from '@/src/api/groups';
import { getExpenses } from '@/src/api/expenses';
import { useAuthStore } from '@/src/stores/authStore';
import { useThemeStore } from '@/src/stores/themeStore';
import { Screen } from '@/src/components/ui/Screen';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { AppText } from '@/src/components/ui/AppText';
import { EmptyView, ErrorView } from '@/src/components/ui/StateViews';
import { ListSkeleton } from '@/src/components/ui/ListSkeleton';
import { CategoryIcon } from '@/src/components/expenses/CategoryIcon';
import { formatMoney } from '@/src/utils/format';
import { fonts } from '@/src/theme/typography';
import type { Expense, Group } from '@/src/types/api';

type ReviewItem = {
  expense: Expense;
  group: Group;
  reason: string;
};

function needsReview(expense: Expense): string | null {
  if (expense.deleted) return null;
  if (!expense.category || !expense.category.trim()) {
    return 'Missing category';
  }
  return null;
}

export default function ReviewExpensesScreen() {
  const user = useAuthStore((s) => s.user);
  const t = useThemeStore((s) => s.tokens);
  const router = useRouter();

  const groupsQuery = useQuery({
    queryKey: ['groups'],
    queryFn: getGroups,
    enabled: !!user,
  });

  const activeGroups = useMemo(
    () => (groupsQuery.data ?? []).filter((g) => !g.archived),
    [groupsQuery.data],
  );

  const expenseQueries = useQueries({
    queries: activeGroups.map((g) => ({
      queryKey: ['expenses', g.id],
      queryFn: () => getExpenses(g.id),
      enabled: !!user && activeGroups.length > 0,
    })),
  });

  const loading =
    groupsQuery.isLoading || expenseQueries.some((q) => q.isLoading && !q.data);
  const error =
    groupsQuery.isError || expenseQueries.some((q) => q.isError && !q.data);

  const items = useMemo(() => {
    const out: ReviewItem[] = [];
    activeGroups.forEach((group, idx) => {
      const expenses = expenseQueries[idx]?.data ?? [];
      for (const expense of expenses) {
        const reason = needsReview(expense);
        if (!reason) continue;
        out.push({ expense, group, reason });
      }
    });
    out.sort((a, b) => String(b.expense.date).localeCompare(String(a.expense.date)));
    return out;
  }, [activeGroups, expenseQueries]);

  const refresh = () => {
    void groupsQuery.refetch();
    expenseQueries.forEach((q) => void q.refetch());
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Review expenses',
          headerShown: true,
          headerTintColor: t.brand500,
          headerStyle: { backgroundColor: t.pageBg },
          headerShadowVisible: false,
        }}
      />
      {loading ? (
        <Screen withHeader>
          <ListSkeleton rows={5} />
        </Screen>
      ) : error ? (
        <ErrorView
          message="Could not load expenses to review"
          onRetry={refresh}
        />
      ) : (
        <Screen
          withHeader
          scroll
          refreshing={groupsQuery.isRefetching}
          onRefresh={refresh}
        >
          <AppText muted variant="bodySm" style={{ marginBottom: 14 }}>
            Expenses that need a quick update — missing categories, for example.
            Editing uses the same expense form and split rules as elsewhere.
          </AppText>

          {items.length === 0 ? (
            <EmptyView
              compact
              icon="checkmark-circle-outline"
              title="All clear"
              message="No expenses need attention right now."
            />
          ) : (
            <View style={{ gap: 10 }}>
              {items.map(({ expense, group, reason }) => {
                const payerId = Object.keys(expense.paid_by)[0];
                const payer = group.members.find((m) => String(m.id) === payerId);
                const splitCount = Object.keys(expense.split_amounts).length;
                return (
                  <Card key={expense.id} elevated="sm" style={styles.card}>
                    <View style={styles.row}>
                      <CategoryIcon category={expense.category} size={42} />
                      <View style={{ flex: 1 }}>
                        <AppText style={{ fontFamily: fonts.bold }} numberOfLines={2}>
                          {expense.description}
                        </AppText>
                        <AppText muted variant="caption" style={{ marginTop: 2 }}>
                          {group.emoji ? `${group.emoji} ` : ''}
                          {group.name}
                        </AppText>
                        <AppText muted variant="caption" style={{ marginTop: 2 }}>
                          {formatMoney(expense.total_amount, group.currency)} ·{' '}
                          {payer ? `${payer.name} paid` : 'Paid'} · split {splitCount}
                        </AppText>
                        <View
                          style={[
                            styles.badge,
                            { backgroundColor: t.brand50, borderColor: t.brand100 },
                          ]}
                        >
                          <AppText
                            variant="caption"
                            style={{ color: t.brand700, fontFamily: fonts.bold }}
                          >
                            {reason}
                          </AppText>
                        </View>
                      </View>
                    </View>
                    <Button
                      title="Review"
                      variant="secondary"
                      onPress={() =>
                        router.push({
                          pathname: '/expenses/edit',
                          params: {
                            id: String(expense.id),
                            groupId: String(group.id),
                          },
                        })
                      }
                    />
                  </Card>
                );
              })}
            </View>
          )}
        </Screen>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
