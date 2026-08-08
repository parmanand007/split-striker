import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';
import { createEditRequest, deleteExpense, getExpense } from '@/src/api/expenses';
import { getGroup } from '@/src/api/groups';
import { useAuthStore } from '@/src/stores/authStore';
import { useThemeStore } from '@/src/stores/themeStore';
import { Screen } from '@/src/components/ui/Screen';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { TextField } from '@/src/components/ui/TextField';
import { AppText } from '@/src/components/ui/AppText';
import { Badge } from '@/src/components/ui/Badge';
import { CategoryLabel } from '@/src/components/expenses/CategoryIcon';
import { ErrorView } from '@/src/components/ui/StateViews';
import { ListSkeleton } from '@/src/components/ui/ListSkeleton';
import { invalidateExpenseQueries } from '@/src/features/expenses/invalidate';
import { formatMoney } from '@/src/utils/format';
import { ApiError } from '@/src/types/api';
import { space } from '@/src/theme/tokens';

export default function ExpenseDetailScreen() {
  const { id, groupId: groupIdParam } = useLocalSearchParams<{ id: string; groupId?: string }>();
  const expenseId = Number(id);
  const user = useAuthStore((s) => s.user);
  const t = useThemeStore((s) => s.tokens);
  const router = useRouter();
  const qc = useQueryClient();
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestDesc, setRequestDesc] = useState('');
  const [requestCategory, setRequestCategory] = useState('');
  const [requestMessage, setRequestMessage] = useState('');

  const expenseQuery = useQuery({
    queryKey: ['expense', expenseId],
    queryFn: () => getExpense(expenseId),
    enabled: Number.isFinite(expenseId),
  });

  const groupId = Number(groupIdParam || expenseQuery.data?.group_id);
  const groupQuery = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => getGroup(groupId),
    enabled: Number.isFinite(groupId),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteExpense(expenseId, user?.id),
    onSuccess: async () => {
      await invalidateExpenseQueries(qc, groupId, expenseId);
      router.back();
    },
    onError: (e) => Alert.alert('Delete failed', e instanceof ApiError ? e.detail : String(e)),
  });

  const requestMutation = useMutation({
    mutationFn: () => {
      const proposed: Record<string, string> = {};
      if (requestDesc.trim()) proposed.description = requestDesc.trim();
      if (requestCategory.trim()) proposed.category = requestCategory.trim();
      if (!Object.keys(proposed).length) {
        throw new Error('Propose at least a description or category change.');
      }
      return createEditRequest(expenseId, {
        requested_by_id: user!.id,
        proposed_changes: proposed,
        message: requestMessage.trim() || undefined,
      });
    },
    onSuccess: async () => {
      await invalidateExpenseQueries(qc, groupId, expenseId);
      setRequestOpen(false);
      Alert.alert('Request sent', 'The group owner can review your edit request.');
    },
    onError: (e) =>
      Alert.alert('Request failed', e instanceof ApiError ? e.detail : String(e)),
  });

  if (expenseQuery.isLoading) {
    return (
      <Screen withHeader>
        <ListSkeleton rows={4} />
      </Screen>
    );
  }
  if (expenseQuery.isError || !expenseQuery.data) {
    return (
      <ErrorView
        message={expenseQuery.error instanceof Error ? expenseQuery.error.message : 'Not found'}
        onRetry={() => void expenseQuery.refetch()}
      />
    );
  }

  const expense = expenseQuery.data;
  const group = groupQuery.data;
  const currency = group?.currency || expense.original_currency;
  const isOwner = group?.created_by_id === user?.id;
  const myShare = Number(expense.split_amounts[String(user?.id)] || 0);
  const myPaid = Number(expense.paid_by[String(user?.id)] || 0);
  const myNet = myPaid - myShare;

  return (
    <>
      <Stack.Screen options={{ title: expense.description, headerShown: true }} />
      <Screen withHeader scroll keyboard={requestOpen && !isOwner}>
        <Card elevated="md" style={{ gap: 8 }}>
          <View style={styles.titleRow}>
            <AppText variant="title" style={{ flex: 1 }}>
              {expense.description}
            </AppText>
            {expense.is_negative ? <Badge label="REFUND" tone="warning" /> : null}
          </View>
          <AppText variant="display" style={{ fontSize: 28 }}>
            {formatMoney(expense.total_amount, currency)}
          </AppText>
          <View style={{ marginTop: 4 }}>
            <CategoryLabel category={expense.category} size={32} />
          </View>
          <AppText muted variant="bodySm">
            {expense.date}
            {` · ${expense.split_type}`}
          </AppText>
          {expense.original_currency !== currency ? (
            <AppText muted variant="caption">
              Original {formatMoney(expense.original_amount, expense.original_currency)} @{' '}
              {expense.fx_rate}
            </AppText>
          ) : null}
          {Math.abs(myShare) > 0.005 ? (
            <View
              style={[
                styles.shareStrip,
                { borderTopColor: t.cardBorder, backgroundColor: t.brand50 },
              ]}
            >
              <AppText muted variant="caption">
                Your share: {formatMoney(String(myShare), currency)}
              </AppText>
              <AppText
                variant="caption"
                style={{
                  color: myNet >= 0 ? t.positive : t.negative,
                  fontWeight: '700',
                }}
              >
                {Math.abs(myNet) < 0.005
                  ? 'your share paid'
                  : myNet > 0
                    ? `you're owed ${formatMoney(String(myNet), currency)}`
                    : `you owe ${formatMoney(String(Math.abs(myNet)), currency)}`}
              </AppText>
            </View>
          ) : null}
        </Card>

        <AppText variant="titleSm" style={styles.section}>
          Paid by
        </AppText>
        <Card elevated="sm">
          {Object.entries(expense.paid_by).map(([uid, amt]) => {
            const member = group?.members.find((m) => String(m.id) === uid);
            return (
              <View key={uid} style={styles.row}>
                <AppText>
                  {member?.name || `User ${uid}`}
                  {Number(uid) === user?.id ? ' (you)' : ''}
                </AppText>
                <AppText style={{ fontWeight: '700' }}>{formatMoney(amt, currency)}</AppText>
              </View>
            );
          })}
        </Card>

        <AppText variant="titleSm" style={styles.section}>
          Split
        </AppText>
        <Card elevated="sm">
          {Object.entries(expense.split_amounts).map(([uid, amt]) => {
            const member = group?.members.find((m) => String(m.id) === uid);
            const raw = expense.split_raw?.[uid];
            return (
              <View key={uid} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <AppText>
                    {member?.name || `User ${uid}`}
                    {Number(uid) === user?.id ? ' (you)' : ''}
                  </AppText>
                  {raw && expense.split_type !== 'equal' ? (
                    <AppText muted variant="caption">
                      {expense.split_type === 'percentage'
                        ? `${raw}%`
                        : expense.split_type === 'shares'
                          ? `${raw} shares`
                          : `raw ${raw}`}
                    </AppText>
                  ) : null}
                </View>
                <AppText style={{ fontWeight: '700' }}>{formatMoney(amt, currency)}</AppText>
              </View>
            );
          })}
        </Card>

        <View style={{ gap: 10, marginTop: 20 }}>
          {isOwner ? (
            <Button
              title="Edit expense"
              onPress={() =>
                router.push({
                  pathname: '/expenses/edit',
                  params: { id: String(expenseId), groupId: String(groupId) },
                })
              }
            />
          ) : (
            <Button
              title={requestOpen ? 'Cancel request' : 'Request edit'}
              variant="secondary"
              onPress={() => {
                if (!requestOpen) {
                  setRequestDesc(expense.description);
                  setRequestCategory(expense.category || '');
                  setRequestMessage('');
                }
                setRequestOpen((v) => !v);
              }}
            />
          )}

          {requestOpen && !isOwner ? (
            <Card elevated="sm" style={{ gap: 12 }}>
              <AppText style={{ fontWeight: '700' }}>Propose changes</AppText>
              <TextField
                label="Description"
                value={requestDesc}
                onChangeText={setRequestDesc}
              />
              <TextField
                label="Category"
                value={requestCategory}
                onChangeText={setRequestCategory}
                placeholder="Food & Drink"
              />
              <TextField
                label="Message to owner (optional)"
                value={requestMessage}
                onChangeText={setRequestMessage}
              />
              <Button
                title="Send request"
                loading={requestMutation.isPending}
                onPress={() => requestMutation.mutate()}
              />
            </Card>
          ) : null}

          {isOwner ? (
            <Button
              title="Delete expense"
              variant="danger"
              loading={deleteMutation.isPending}
              onPress={() =>
                Alert.alert('Delete expense?', 'This soft-deletes the expense.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
                ])
              }
            />
          ) : null}
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: space.xl, marginBottom: space.sm },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  shareStrip: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
});
