import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Alert, StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getBalances, getSettlement } from '@/src/api/balances';
import { getGroup, updateGroup } from '@/src/api/groups';
import { createPayment } from '@/src/api/settlements';
import { useAuthStore } from '@/src/stores/authStore';
import { useThemeStore } from '@/src/stores/themeStore';
import { Screen } from '@/src/components/ui/Screen';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { AppText } from '@/src/components/ui/AppText';
import { EmptyView, ErrorView } from '@/src/components/ui/StateViews';
import { ListSkeleton } from '@/src/components/ui/ListSkeleton';
import { formatMoney, formatSignedMoney, todayISO } from '@/src/utils/format';
import { ApiError, SettlementItem } from '@/src/types/api';
import { space } from '@/src/theme/tokens';
import * as Haptics from 'expo-haptics';

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
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
      Alert.alert('Payment recorded');
    },
    onError: (e) => {
      Alert.alert('Payment failed', e instanceof ApiError ? e.detail : String(e));
    },
  });

  if (settlementQuery.isLoading || groupQuery.isLoading) {
    return (
      <Screen withHeader>
        <ListSkeleton rows={5} />
      </Screen>
    );
  }
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
        <Card elevated="sm" style={styles.rowBetween}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <AppText style={{ fontWeight: '700' }}>Simplify debts</AppText>
            <AppText muted variant="caption" style={{ marginTop: 2 }}>
              {isOwner
                ? 'Fewer suggested transfers'
                : 'Only the group owner can change this'}
            </AppText>
          </View>
          <Switch
            value={plan.simplify_debts}
            disabled={!isOwner || toggleSimplify.isPending}
            onValueChange={(v) => toggleSimplify.mutate(v)}
            trackColor={{ true: t.brand400 }}
            accessibilityLabel="Simplify debts"
          />
        </Card>

        <AppText variant="titleSm" style={styles.section}>
          Balances
        </AppText>
        <Card elevated="sm" style={{ marginBottom: 16 }}>
          {balancesQuery.isError ? (
            <ErrorView
              framed={false}
              message="Could not load balances"
              onRetry={() => void balancesQuery.refetch()}
            />
          ) : (
            (balancesQuery.data?.balances ?? []).map((b, idx, arr) => {
              const n = Number(b.balance);
              return (
                <View
                  key={b.user_id}
                  style={[
                    styles.rowBetween,
                    idx < arr.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: t.cardBorder,
                      paddingBottom: 10,
                      marginBottom: 6,
                    },
                  ]}
                >
                  <AppText>{b.user_name}</AppText>
                  <AppText
                    style={{
                      color:
                        n > 0.005 ? t.positive : n < -0.005 ? t.negative : t.textMuted,
                      fontWeight: '700',
                    }}
                  >
                    {formatSignedMoney(b.balance, plan.currency)}
                  </AppText>
                </View>
              );
            })
          )}
        </Card>

        <AppText variant="titleSm" style={styles.section}>
          Suggested payments
        </AppText>
        {plan.settlements.length === 0 ? (
          <EmptyView
            compact
            icon="checkmark-circle-outline"
            title="All settled up"
            message="No payments needed right now."
          />
        ) : (
          <View style={{ gap: 10 }}>
            {plan.settlements.map((item, idx) => (
              <Card
                key={`${item.from_user_id}-${item.to_user_id}-${idx}`}
                elevated="md"
                padded={false}
              >
                <LinearGradient
                  colors={[t.brand50, t.cardBg]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.payCard}
                >
                  <View style={styles.payPath}>
                    <View style={[styles.payIcon, { backgroundColor: t.brand100 }]}>
                      <Ionicons name="swap-horizontal" size={18} color={t.brand600} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText style={{ fontWeight: '700' }}>
                        {item.from_user_name} → {item.to_user_name}
                      </AppText>
                      <AppText variant="money" style={{ color: t.brand700, marginTop: 4 }}>
                        {formatMoney(item.amount, item.currency)}
                      </AppText>
                    </View>
                  </View>
                  <Button
                    title={paying === item ? 'Recording…' : 'Record payment'}
                    loading={payMutation.isPending && paying === item}
                    onPress={() => {
                      setPaying(item);
                      payMutation.mutate(item);
                    }}
                  />
                </LinearGradient>
              </Card>
            ))}
          </View>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: space.xl, marginBottom: space.sm },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  payCard: {
    padding: space.lg,
    gap: 12,
  },
  payPath: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  payIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
