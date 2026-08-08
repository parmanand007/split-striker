import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { getBalances, getSettlement } from '@/src/api/balances';
import { getGroup, updateGroup } from '@/src/api/groups';
import { createPayment } from '@/src/api/settlements';
import { useAuthStore } from '@/src/stores/authStore';
import { useThemeStore } from '@/src/stores/themeStore';
import { Screen } from '@/src/components/ui/Screen';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { EmptyView, ErrorView, LoadingView } from '@/src/components/ui/StateViews';
import { formatMoney, formatSignedMoney, todayISO } from '@/src/utils/format';
import { ApiError, SettlementItem } from '@/src/types/api';

export default function SettleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Number(id);
  const user = useAuthStore((s) => s.user);
  const t = useThemeStore((s) => s.tokens);
  const qc = useQueryClient();
  const [paying, setPaying] = useState<SettlementItem | null>(null);

  const groupQuery = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => getGroup(groupId),
    enabled: Number.isFinite(groupId),
  });
  const settlementQuery = useQuery({
    queryKey: ['settlement', groupId],
    queryFn: () => getSettlement(groupId),
    enabled: Number.isFinite(groupId),
  });
  const balancesQuery = useQuery({
    queryKey: ['balances', groupId],
    queryFn: () => getBalances(groupId),
    enabled: Number.isFinite(groupId),
  });

  const isOwner = groupQuery.data?.created_by_id === user?.id;

  const toggleSimplify = useMutation({
    mutationFn: async (value: boolean) => updateGroup(groupId, { simplify_debts: value }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['settlement', groupId] });
      await qc.invalidateQueries({ queryKey: ['group', groupId] });
    },
    onError: (e) =>
      Alert.alert('Update failed', e instanceof ApiError ? e.detail : String(e)),
  });

  const payMutation = useMutation({
    mutationFn: (item: SettlementItem) =>
      createPayment(groupId, {
        from_user_id: item.from_user_id,
        to_user_id: item.to_user_id,
        amount: item.amount,
        currency: item.currency,
        date: todayISO(),
        actor_user_id: user!.id,
      }),
    onSuccess: async () => {
      setPaying(null);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['settlement', groupId] }),
        qc.invalidateQueries({ queryKey: ['balances', groupId] }),
        qc.invalidateQueries({ queryKey: ['summary'] }),
        qc.invalidateQueries({ queryKey: ['activity'] }),
      ]);
      Alert.alert('Payment recorded');
    },
    onError: (e) => {
      Alert.alert('Payment failed', e instanceof ApiError ? e.detail : String(e));
    },
  });

  if (settlementQuery.isLoading || groupQuery.isLoading) return <LoadingView />;
  if (settlementQuery.isError || !settlementQuery.data) {
    return (
      <ErrorView
        message={
          settlementQuery.error instanceof Error ? settlementQuery.error.message : 'Failed'
        }
        onRetry={() => void settlementQuery.refetch()}
      />
    );
  }

  const plan = settlementQuery.data;

  return (
    <>
      <Stack.Screen options={{ title: 'Settle up' }} />
      <Screen
        withHeader
        scroll
        refreshing={settlementQuery.isRefetching}
        onRefresh={() => {
          void settlementQuery.refetch();
          void balancesQuery.refetch();
        }}
      >
        <Card style={styles.rowBetween}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ color: t.text, fontWeight: '700' }}>Simplify debts</Text>
            <Text style={{ color: t.textMuted, fontSize: 12 }}>
              {isOwner
                ? 'Fewer suggested transfers'
                : 'Only the group owner can change this'}
            </Text>
          </View>
          <Switch
            value={plan.simplify_debts}
            disabled={!isOwner || toggleSimplify.isPending}
            onValueChange={(v) => toggleSimplify.mutate(v)}
            trackColor={{ true: t.brand400 }}
            accessibilityLabel="Simplify debts"
          />
        </Card>

        <Text style={[styles.section, { color: t.text }]}>Balances</Text>
        <Card style={{ marginBottom: 16 }}>
          {balancesQuery.isError ? (
            <ErrorView
              framed={false}
              message="Could not load balances"
              onRetry={() => void balancesQuery.refetch()}
            />
          ) : (
            (balancesQuery.data?.balances ?? []).map((b) => {
              const n = Number(b.balance);
              return (
                <View key={b.user_id} style={styles.rowBetween}>
                  <Text style={{ color: t.text }}>{b.user_name}</Text>
                  <Text
                    style={{
                      color:
                        n > 0.005 ? t.positive : n < -0.005 ? t.negative : t.textMuted,
                      fontWeight: '700',
                    }}
                  >
                    {formatSignedMoney(b.balance, plan.currency)}
                  </Text>
                </View>
              );
            })
          )}
        </Card>

        <Text style={[styles.section, { color: t.text }]}>Suggested payments</Text>
        {plan.settlements.length === 0 ? (
          <EmptyView compact title="All settled up" message="No payments needed right now." />
        ) : (
          <View style={{ gap: 10 }}>
            {plan.settlements.map((item, idx) => (
              <Card key={`${item.from_user_id}-${item.to_user_id}-${idx}`} style={{ gap: 10 }}>
                <Text style={{ color: t.text, fontWeight: '700' }}>
                  {item.from_user_name} → {item.to_user_name}
                </Text>
                <Text style={{ color: t.textMuted }}>
                  {formatMoney(item.amount, item.currency)}
                </Text>
                <Button
                  title={paying === item ? 'Recording…' : 'Record payment'}
                  loading={payMutation.isPending && paying === item}
                  onPress={() => {
                    setPaying(item);
                    payMutation.mutate(item);
                  }}
                />
              </Card>
            ))}
          </View>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 16, fontWeight: '700', marginTop: 18, marginBottom: 8 },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
});
