import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getBalances } from '@/src/api/balances';
import { getExpenses } from '@/src/api/expenses';
import { getGroup, getGroupActivity } from '@/src/api/groups';
import { useAuthStore } from '@/src/stores/authStore';
import { useThemeStore } from '@/src/stores/themeStore';
import { Screen } from '@/src/components/ui/Screen';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { AppText } from '@/src/components/ui/AppText';
import { SegmentedControl } from '@/src/components/ui/SegmentedControl';
import { ErrorView, EmptyView } from '@/src/components/ui/StateViews';
import { ExpenseRow } from '@/src/components/expenses/ExpenseRow';
import { MemberRow } from '@/src/components/groups/MemberRow';
import { TripBudgetCard } from '@/src/components/groups/TripBudgetCard';
import { GroupDetailSkeleton, GroupListSkeleton } from '@/src/components/groups/GroupSkeleton';
import { formatGroupBalanceLabel } from '@/src/features/groups/balanceLabel';
import { activityIconName, activityTitle } from '@/src/utils/activity';
import { formatActivityTime, formatMoney, formatSignedMoney } from '@/src/utils/format';
import { ApiError } from '@/src/types/api';
import { space } from '@/src/theme/tokens';

type Tab = 'expenses' | 'balances' | 'members' | 'activity';

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Number(id);
  const user = useAuthStore((s) => s.user);
  const t = useThemeStore((s) => s.tokens);
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('expenses');

  const groupQuery = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => getGroup(groupId),
    enabled: Number.isFinite(groupId),
  });
  const expensesQuery = useQuery({
    queryKey: ['expenses', groupId],
    queryFn: () => getExpenses(groupId),
    enabled: Number.isFinite(groupId),
  });
  const balancesQuery = useQuery({
    queryKey: ['balances', groupId],
    queryFn: () => getBalances(groupId),
    enabled: Number.isFinite(groupId),
  });
  const activityQuery = useQuery({
    queryKey: ['group-activity', groupId],
    queryFn: () => getGroupActivity(groupId),
    enabled: Number.isFinite(groupId) && tab === 'activity',
  });

  const myBalance = useMemo(() => {
    const bal = balancesQuery.data?.balances.find((b) => b.user_id === user?.id);
    return bal ? Number(bal.balance) : 0;
  }, [balancesQuery.data, user?.id]);

  const balanceByUser = useMemo(() => {
    const map = new Map<number, string>();
    for (const b of balancesQuery.data?.balances ?? []) {
      map.set(b.user_id, b.balance);
    }
    return map;
  }, [balancesQuery.data]);

  const expenses = useMemo(() => {
    const list = expensesQuery.data ?? [];
    return [...list].sort((a, b) => {
      const byDate = String(b.date).localeCompare(String(a.date));
      if (byDate !== 0) return byDate;
      return b.id - a.id;
    });
  }, [expensesQuery.data]);

  const refreshing =
    groupQuery.isRefetching ||
    expensesQuery.isRefetching ||
    balancesQuery.isRefetching ||
    activityQuery.isRefetching;

  const onRefresh = () => {
    void groupQuery.refetch();
    void expensesQuery.refetch();
    void balancesQuery.refetch();
    if (tab === 'activity') void activityQuery.refetch();
  };

  if (groupQuery.isLoading) {
    return (
      <Screen withHeader>
        <GroupDetailSkeleton />
      </Screen>
    );
  }

  if (groupQuery.isError || !groupQuery.data) {
    return (
      <ErrorView
        message={
          groupQuery.error instanceof ApiError
            ? groupQuery.error.detail
            : groupQuery.error instanceof Error
              ? groupQuery.error.message
              : 'Group not found'
        }
        onRetry={() => void groupQuery.refetch()}
      />
    );
  }

  const group = groupQuery.data;
  const currency = group.currency;
  const archived = group.archived;

  return (
    <>
      <Stack.Screen
        options={{
          title: `${group.emoji ? group.emoji + ' ' : ''}${group.name}`,
          headerRight: () => (
            <Pressable
              onPress={() => router.push(`/groups/${groupId}/settings`)}
              accessibilityRole="button"
              accessibilityLabel="Group settings"
              hitSlop={12}
              style={{ paddingHorizontal: 8, minWidth: 44, minHeight: 44, justifyContent: 'center' }}
            >
              <Ionicons name="settings-outline" size={22} color={t.brand500} />
            </Pressable>
          ),
        }}
      />
      <Screen withHeader scroll refreshing={refreshing} onRefresh={onRefresh}>
        {archived ? (
          <View style={[styles.banner, { backgroundColor: t.brand50, borderColor: t.brand100 }]}>
            <AppText style={{ color: t.brand700, fontWeight: '700' }}>This group is archived</AppText>
          </View>
        ) : null}

        <Card elevated="md" padded={false} style={{ marginBottom: 12, overflow: 'hidden' }}>
          <LinearGradient
            colors={[t.brand50, t.cardBg]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.balanceHero}
          >
            <AppText muted variant="overline">
              Your balance
            </AppText>
            <AppText
              variant="title"
              style={{
                color:
                  myBalance > 0.005 ? t.positive : myBalance < -0.005 ? t.negative : t.text,
                marginTop: 6,
              }}
            >
              {Math.abs(myBalance) < 0.005
                ? 'All settled up'
                : myBalance > 0
                  ? `You are owed ${formatMoney(myBalance, currency)}`
                  : `You owe ${formatMoney(Math.abs(myBalance), currency)}`}
            </AppText>
            <AppText muted variant="caption" style={{ marginTop: 6 }}>
              {group.members.length} members · {currency}
            </AppText>
          </LinearGradient>
        </Card>

        <TripBudgetCard
          group={group}
          expenses={expenses}
          onEdit={
            group.created_by_id === user?.id
              ? () => router.push(`/groups/${groupId}/settings`)
              : undefined
          }
        />

        <View style={styles.actions}>
          <Button
            title="Add expense"
            fullWidth={false}
            disabled={archived}
            onPress={() =>
              router.push({ pathname: '/expenses/create', params: { groupId: String(groupId) } })
            }
          />
          <Button
            title="Settle up"
            variant="secondary"
            fullWidth={false}
            onPress={() => router.push(`/groups/${groupId}/settle`)}
          />
        </View>

        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { key: 'expenses', label: 'Expenses' },
            { key: 'balances', label: 'Balances' },
            { key: 'members', label: 'Members' },
            { key: 'activity', label: 'Activity' },
          ]}
        />

        {tab === 'expenses' ? (
          expensesQuery.isLoading ? (
            <GroupListSkeleton />
          ) : expensesQuery.isError ? (
            <ErrorView
              message={
                expensesQuery.error instanceof ApiError
                  ? expensesQuery.error.detail
                  : 'Could not load expenses'
              }
              onRetry={() => void expensesQuery.refetch()}
            />
          ) : expenses.length === 0 ? (
            <EmptyView
              compact
              title="No expenses"
              message="Add the first expense for this group."
              actionLabel={archived ? undefined : 'Add expense'}
              onAction={
                archived
                  ? undefined
                  : () =>
                      router.push({
                        pathname: '/expenses/create',
                        params: { groupId: String(groupId) },
                      })
              }
            />
          ) : (
            <View style={{ gap: 10 }}>
              {expenses.map((e) => (
                <ExpenseRow
                  key={e.id}
                  expense={e}
                  members={group.members}
                  currency={currency}
                  onPress={() =>
                    router.push({
                      pathname: '/expenses/[id]',
                      params: { id: String(e.id), groupId: String(groupId) },
                    })
                  }
                />
              ))}
            </View>
          )
        ) : null}

        {tab === 'balances' ? (
          balancesQuery.isLoading ? (
            <GroupDetailSkeleton />
          ) : balancesQuery.isError ? (
            <ErrorView
              framed={false}
              message={
                balancesQuery.error instanceof ApiError
                  ? balancesQuery.error.detail
                  : 'Could not load balances'
              }
              onRetry={() => void balancesQuery.refetch()}
            />
          ) : (balancesQuery.data?.balances ?? []).length === 0 ? (
            <EmptyView
              compact
              title="No balances"
              message="Balances appear after expenses are added."
            />
          ) : (
            <Card elevated="sm">
              {(balancesQuery.data?.balances ?? []).map((b, idx, arr) => (
                <View
                  key={b.user_id}
                  style={[
                    styles.balRow,
                    idx < arr.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: t.cardBorder,
                    },
                  ]}
                >
                  <AppText style={{ fontWeight: '600' }}>
                    {b.user_name}
                    {b.user_id === user?.id ? ' (you)' : ''}
                  </AppText>
                  <AppText
                    style={{
                      color:
                        Number(b.balance) > 0.005
                          ? t.positive
                          : Number(b.balance) < -0.005
                            ? t.negative
                            : t.textMuted,
                      fontWeight: '700',
                    }}
                  >
                    {formatSignedMoney(b.balance, currency)}
                  </AppText>
                </View>
              ))}
              <Button
                title="Settle up"
                variant="secondary"
                style={{ marginTop: 12 }}
                onPress={() => router.push(`/groups/${groupId}/settle`)}
              />
            </Card>
          )
        ) : null}

        {tab === 'members' ? (
          <View style={{ gap: 10 }}>
            <Button
              title="Manage members"
              variant="secondary"
              onPress={() => router.push(`/groups/${groupId}/members`)}
            />
            {group.members.map((m) => {
              const bal = balanceByUser.get(m.id);
              const n = bal != null ? Number(bal) : 0;
              return (
                <MemberRow
                  key={m.id}
                  user={m}
                  isOwner={m.id === group.created_by_id}
                  isYou={m.id === user?.id}
                  balanceLabel={formatGroupBalanceLabel(bal, currency)}
                  balanceTone={
                    n > 0.005 ? 'positive' : n < -0.005 ? 'negative' : 'neutral'
                  }
                />
              );
            })}
          </View>
        ) : null}

        {tab === 'activity' ? (
          activityQuery.isLoading ? (
            <GroupDetailSkeleton />
          ) : activityQuery.isError ? (
            <ErrorView
              framed={false}
              message={
                activityQuery.error instanceof ApiError
                  ? activityQuery.error.detail
                  : 'Could not load activity'
              }
              onRetry={() => void activityQuery.refetch()}
            />
          ) : (activityQuery.data ?? []).length === 0 ? (
            <EmptyView compact title="No activity" message="Group changes will appear here." />
          ) : (
            <Card elevated="sm" padded={false} style={{ paddingVertical: 4 }}>
              {(activityQuery.data ?? []).map((log, idx, arr) => (
                <Pressable
                  key={log.id}
                  onPress={() => {
                    if (log.entity_type === 'expense' && log.entity_id) {
                      router.push({
                        pathname: '/expenses/[id]',
                        params: {
                          id: String(log.entity_id),
                          groupId: String(groupId),
                        },
                      });
                    }
                  }}
                  style={[
                    styles.activityRow,
                    idx < arr.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: t.cardBorder,
                    },
                  ]}
                >
                  <View style={[styles.actIcon, { backgroundColor: t.brand50 }]}>
                    <Ionicons
                      name={activityIconName(log)}
                      size={16}
                      color={t.brand600}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText style={{ fontWeight: '600' }}>{activityTitle(log)}</AppText>
                    <AppText muted variant="caption" style={{ marginTop: 2 }}>
                      {formatActivityTime(log.created_at)}
                    </AppText>
                  </View>
                </Pressable>
              ))}
            </Card>
          )
        ) : null}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 14,
    padding: space.md,
    marginBottom: space.md,
    borderWidth: 1,
  },
  balanceHero: {
    padding: space.lg,
  },
  actions: { gap: 10, marginBottom: 14, alignItems: 'center' },
  balRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
