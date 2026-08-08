import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { getExpense, updateExpense } from '@/src/api/expenses';
import { getGroup } from '@/src/api/groups';
import { useAuthStore } from '@/src/stores/authStore';
import { Screen } from '@/src/components/ui/Screen';
import { ErrorView, LoadingView } from '@/src/components/ui/StateViews';
import { ExpenseForm } from '@/src/features/expenses/ExpenseForm';
import { invalidateExpenseQueries } from '@/src/features/expenses/invalidate';
import { ApiError, type ExpenseCreateInput } from '@/src/types/api';

export default function EditExpenseScreen() {
  const { id, groupId: groupIdParam } = useLocalSearchParams<{ id: string; groupId: string }>();
  const expenseId = Number(id);
  const groupId = Number(groupIdParam);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const qc = useQueryClient();

  const expenseQuery = useQuery({
    queryKey: ['expense', expenseId],
    queryFn: () => getExpense(expenseId),
    enabled: Number.isFinite(expenseId),
  });
  const resolvedGroupId = Number.isFinite(groupId)
    ? groupId
    : Number(expenseQuery.data?.group_id);
  const groupQuery = useQuery({
    queryKey: ['group', resolvedGroupId],
    queryFn: () => getGroup(resolvedGroupId),
    enabled: Number.isFinite(resolvedGroupId),
  });

  const mutation = useMutation({
    mutationFn: (payload: ExpenseCreateInput) => updateExpense(expenseId, payload),
    onSuccess: async () => {
      await invalidateExpenseQueries(qc, resolvedGroupId, expenseId);
      Alert.alert('Saved', 'Expense updated.');
      router.back();
    },
    onError: (e) =>
      Alert.alert('Update failed', e instanceof ApiError ? e.detail : String(e)),
  });

  if (expenseQuery.isLoading || groupQuery.isLoading) return <LoadingView />;
  if (expenseQuery.isError || !expenseQuery.data || !groupQuery.data || !user) {
    return (
      <ErrorView
        message="Expense not found"
        onRetry={() => {
          void expenseQuery.refetch();
          void groupQuery.refetch();
        }}
      />
    );
  }

  const isOwner = groupQuery.data.created_by_id === user.id;
  if (!isOwner) {
    return (
      <ErrorView message="Only the group owner can edit expenses directly. Use Request edit from the expense details." />
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Edit expense', headerShown: true }} />
      <Screen withHeader scroll keyboard>
        <ExpenseForm
          group={groupQuery.data}
          currentUser={user}
          expense={expenseQuery.data}
          submitting={mutation.isPending}
          onSubmit={(payload) => mutation.mutate(payload)}
        />
      </Screen>
    </>
  );
}
