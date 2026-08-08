import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getBalances } from '@/src/api/balances';
import { getExpenses } from '@/src/api/expenses';
import { getGroup, getGroupActivity } from '@/src/api/groups';
import { useAuthStore } from '@/src/stores/authStore';
import { useThemeStore } from '@/src/stores/themeStore';
import { Screen } from '@/src/components/ui/Screen';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { ErrorView, EmptyView } from '@/src/components/ui/StateViews';
import { ExpenseRow } from '@/src/components/expenses/ExpenseRow';
import { MemberRow } from '@/src/components/groups/MemberRow';
import { GroupDetailSkeleton } from '@/src/components/groups/GroupSkeleton';
import { formatGroupBalanceLabel } from '@/src/features/groups/balanceLabel';
import { activityIconName, activityTitle } from '@/src/utils/activity';
import { formatMoney, formatSignedMoney, relativeTime } from '@/src/utils/format';
import { ApiError } from '@/src/types/api';

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
          <View style={[styles.banner, { backgroundColor: t.brand50 }]}>
            <Text style={{ color: t.brand700, fontWeight: '700' }}>This group is archived</Text>
          </View>
        ) : null}

        <Card style={{ marginBottom: 12 }}>
          <Text style={{ color: t.textMuted, fontWeight: '700', fontSize: 12 }}>YOUR BALANCE</Text>
          <Text
            style={{
              color:
                myBalance > 0.005 ? t.positive : myBalance < -0.005 ? t.negative : t.text,
              fontSize: 22,
              fontWeight: '800',
              marginTop: 6,
            }}
          >
            {Math.abs(myBalance) < 0.005
              ? 'All settled up'
              : myBalance > 0
                ? `You are owed ${formatMoney(myBalance, currency)}`
                : `You owe ${formatMoney(Math.abs(myBalance), currency)}`}
          </Text>
          <Text style={{ color: t.textMuted, marginTop: 6, fontSize: 12 }}>
            {group.members.length} members · {currency}
          </Text>
        </Card>

        <View style={styles.actions}>
          <Button
            title="Add expense"
            disabled={archived}
            onPress={() =>
              router.push({ pathname: '/expenses/create', params: { groupId: String(groupId) } })
            }
            style={{ flex: 1 }}
          />
          <Button
            title="Settle up"
            variant="secondary"
            onPress={() => router.push(`/groups/${groupId}/settle`)}
            style={{ flex: 1 }}
          />
        </View>

        <View style={styles.tabs}>
          {(['expenses', 'balances', 'members', 'activity'] as Tab[]).map((key) => (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === key }}
              accessibilityLabel={`${key} tab`}
              style={[
                styles.tab,
                {
                  backgroundColor: tab === key ? t.brand500 : t.cardBg,
                  borderColor: t.cardBorder,
                },
              ]}
            >
              <Text
                style={{
                  color: tab === key ? t.btnPrimaryText : t.text,
                  fontWeight: '700',
                  fontSize: 12,
                  textTransform: 'capitalize',
                }}
              >
                {key}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab === 'expenses' ? (
          expensesQuery.isLoading ? (
            <GroupDetailSkeleton />
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
            <Card>
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
                  <Text style={{ color: t.text, fontWeight: '600' }}>
                    {b.user_name}
                    {b.user_id === user?.id ? ' (you)' : ''}
                  </Text>
                  <Text
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
                  </Text>
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
            <Card style={{ paddingVertical: 4 }}>
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
                    <Text style={{ color: t.text, fontWeight: '600' }}>{activityTitle(log)}</Text>
                    <Text style={{ color: t.textMuted, fontSize: 12, marginTop: 2 }}>
                      {relativeTime(log.created_at)}
                    </Text>
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
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  tab: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    paddingVertical: 12,
  },
  actIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
