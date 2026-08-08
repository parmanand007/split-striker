import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { checkDuplicate, createExpense } from '@/src/api/expenses';
import { getGroup } from '@/src/api/groups';
import { useAuthStore } from '@/src/stores/authStore';
import { Screen } from '@/src/components/ui/Screen';
import { ErrorView, LoadingView } from '@/src/components/ui/StateViews';
import { ExpenseForm } from '@/src/features/expenses/ExpenseForm';
import { invalidateExpenseQueries } from '@/src/features/expenses/invalidate';
import { ApiError, type ExpenseCreateInput } from '@/src/types/api';

export default function CreateExpenseScreen() {
  const { groupId: groupIdParam } = useLocalSearchParams<{ groupId: string }>();
  const groupId = Number(groupIdParam);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const qc = useQueryClient();
  const [dupWarning, setDupWarning] = useState<string | null>(null);
  const dupSeq = useRef(0);
  const [dupProbe, setDupProbe] = useState<{
    description: string;
    amount: string;
    payerId: number | null;
  }>({ description: '', amount: '', payerId: null });

  const groupQuery = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => getGroup(groupId),
    enabled: Number.isFinite(groupId),
  });

  const handleFieldChange = useCallback(
    (description: string, amount: string, payerId: number | null) => {
      setDupProbe({ description, amount, payerId });
    },
    [],
  );

  const canCheckDuplicate =
    !!dupProbe.description.trim() &&
    !!dupProbe.amount &&
    !!dupProbe.payerId &&
    Number.isFinite(groupId);

  useEffect(() => {
    if (!canCheckDuplicate) return;

    const { description, amount, payerId } = dupProbe;
    const seq = ++dupSeq.current;
    const timer = setTimeout(() => {
      void checkDuplicate(groupId, {
        description: description.trim(),
        amount,
        payer_id: String(payerId),
      })
        .then((r) => {
          if (seq !== dupSeq.current) return;
          setDupWarning(r.is_duplicate ? r.message || 'Similar expense found' : null);
        })
        .catch(() => {
          if (seq !== dupSeq.current) return;
          setDupWarning(null);
        });
    }, 700);

    return () => {
      clearTimeout(timer);
      dupSeq.current += 1;
    };
  }, [canCheckDuplicate, dupProbe, groupId]);

  const activeDupWarning = canCheckDuplicate ? dupWarning : null;

  const mutation = useMutation({
    mutationFn: async (payload: ExpenseCreateInput) => {
      if (activeDupWarning) {
        const ok = await new Promise<boolean>((resolve) => {
          Alert.alert('Possible duplicate', activeDupWarning, [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Add anyway', onPress: () => resolve(true) },
          ]);
        });
        if (!ok) throw new Error('Cancelled');
      }
      return createExpense(groupId, payload);
    },
    onSuccess: async () => {
      await invalidateExpenseQueries(qc, groupId);
      router.back();
    },
    onError: (e) => {
      if (String(e.message) === 'Cancelled') return;
      Alert.alert('Could not add expense', e instanceof ApiError ? e.detail : String(e));
    },
  });

  if (!Number.isFinite(groupId)) {
    return <ErrorView message="Missing group" />;
  }
  if (groupQuery.isLoading) return <LoadingView />;
  if (groupQuery.isError || !groupQuery.data || !user) {
    return (
      <ErrorView
        message={
          groupQuery.error instanceof ApiError
            ? groupQuery.error.detail
            : 'Could not load group'
        }
        onRetry={() => void groupQuery.refetch()}
      />
    );
  }

  if (groupQuery.data.archived) {
    return <ErrorView message="This group is archived. Expenses cannot be added." />;
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Add expense', headerShown: true }} />
      <Screen withHeader scroll keyboard>
        <ExpenseForm
          group={groupQuery.data}
          currentUser={user}
          submitting={mutation.isPending}
          duplicateWarning={activeDupWarning}
          onDescriptionAmountChange={handleFieldChange}
          onSubmit={(payload) => mutation.mutate(payload)}
        />
      </Screen>
    </>
  );
}
