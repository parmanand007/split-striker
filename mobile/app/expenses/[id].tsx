import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { createEditRequest, deleteExpense, getExpense } from '@/src/api/expenses';
import { getGroup } from '@/src/api/groups';
import { useAuthStore } from '@/src/stores/authStore';
import { useThemeStore } from '@/src/stores/themeStore';
import { Screen } from '@/src/components/ui/Screen';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { TextField } from '@/src/components/ui/TextField';
import { ErrorView, LoadingView } from '@/src/components/ui/StateViews';
import { invalidateExpenseQueries } from '@/src/features/expenses/invalidate';
import { formatMoney } from '@/src/utils/format';
import { ApiError } from '@/src/types/api';

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

  if (expenseQuery.isLoading) return <LoadingView />;
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
        <Card style={{ gap: 8 }}>
          <View style={styles.titleRow}>
            <Text style={{ color: t.text, fontSize: 22, fontWeight: '800', flex: 1 }}>
              {expense.description}
            </Text>
            {expense.is_negative ? (
              <Text style={[styles.badge, { backgroundColor: '#fef3c7', color: '#b45309' }]}>
                REFUND
              </Text>
            ) : null}
          </View>
          <Text style={{ color: t.text, fontSize: 28, fontWeight: '800' }}>
            {formatMoney(expense.total_amount, currency)}
          </Text>
          <Text style={{ color: t.textMuted }}>
            {expense.date}
            {expense.category ? ` · ${expense.category}` : ''}
            {` · ${expense.split_type}`}
          </Text>
          {expense.original_currency !== currency ? (
            <Text style={{ color: t.textMuted }}>
              Original {formatMoney(expense.original_amount, expense.original_currency)} @{' '}
              {expense.fx_rate}
            </Text>
          ) : null}
          {Math.abs(myShare) > 0.005 ? (
            <View
              style={[
                styles.shareStrip,
                { borderTopColor: t.cardBorder, backgroundColor: t.brand50 },
              ]}
            >
              <Text style={{ color: t.textMuted, fontSize: 12 }}>
                Your share: {formatMoney(String(myShare), currency)}
              </Text>
              <Text
                style={{
                  color: myNet >= 0 ? t.positive : t.negative,
                  fontSize: 12,
                  fontWeight: '700',
                }}
              >
                {Math.abs(myNet) < 0.005
                  ? 'your share paid'
                  : myNet > 0
                    ? `you're owed ${formatMoney(String(myNet), currency)}`
                    : `you owe ${formatMoney(String(Math.abs(myNet)), currency)}`}
              </Text>
            </View>
          ) : null}
        </Card>

        <Text style={[styles.section, { color: t.text }]}>Paid by</Text>
        <Card>
          {Object.entries(expense.paid_by).map(([uid, amt]) => {
            const member = group?.members.find((m) => String(m.id) === uid);
            return (
              <View key={uid} style={styles.row}>
                <Text style={{ color: t.text }}>
                  {member?.name || `User ${uid}`}
                  {Number(uid) === user?.id ? ' (you)' : ''}
                </Text>
                <Text style={{ color: t.text, fontWeight: '700' }}>
                  {formatMoney(amt, currency)}
                </Text>
              </View>
            );
          })}
        </Card>

        <Text style={[styles.section, { color: t.text }]}>Split</Text>
        <Card>
          {Object.entries(expense.split_amounts).map(([uid, amt]) => {
            const member = group?.members.find((m) => String(m.id) === uid);
            const raw = expense.split_raw?.[uid];
            return (
              <View key={uid} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.text }}>
                    {member?.name || `User ${uid}`}
                    {Number(uid) === user?.id ? ' (you)' : ''}
                  </Text>
                  {raw && expense.split_type !== 'equal' ? (
                    <Text style={{ color: t.textMuted, fontSize: 11 }}>
                      {expense.split_type === 'percentage'
                        ? `${raw}%`
                        : expense.split_type === 'shares'
                          ? `${raw} shares`
                          : `raw ${raw}`}
                    </Text>
                  ) : null}
                </View>
                <Text style={{ color: t.text, fontWeight: '700' }}>
                  {formatMoney(amt, currency)}
                </Text>
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
            <Card style={{ gap: 12 }}>
              <Text style={{ color: t.text, fontWeight: '700' }}>Propose changes</Text>
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
  section: { fontSize: 16, fontWeight: '700', marginTop: 18, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  badge: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  shareStrip: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
});
