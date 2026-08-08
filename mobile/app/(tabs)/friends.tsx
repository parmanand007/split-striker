import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { createFriendExpense, getFriendExpenses } from '@/src/api/expenses';
import { getUsers } from '@/src/api/users';
import { useAuthStore } from '@/src/stores/authStore';
import { useThemeStore } from '@/src/stores/themeStore';
import { Screen } from '@/src/components/ui/Screen';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { TextField } from '@/src/components/ui/TextField';
import { CurrencyPicker } from '@/src/components/ui/CurrencyPicker';
import { AppText } from '@/src/components/ui/AppText';
import { Avatar } from '@/src/components/ui/Avatar';
import { EmptyView, ErrorView } from '@/src/components/ui/StateViews';
import { ListSkeleton } from '@/src/components/ui/ListSkeleton';
import { formatMoney, todayISO } from '@/src/utils/format';
import { ApiError } from '@/src/types/api';
import { space } from '@/src/theme/tokens';

const schema = z.object({
  description: z.string().min(1, 'Required'),
  amount: z
    .string()
    .min(1, 'Required')
    .refine((v) => Number.isFinite(Number(v)) && Number(v) !== 0, 'Enter a valid amount'),
  otherUserId: z.string().min(1, 'Pick a friend'),
  currency: z
    .string()
    .trim()
    .refine((v) => /^[A-Za-z]{3}$/.test(v), 'Use a 3-letter currency code'),
});

type FormValues = z.infer<typeof schema>;

export default function FriendsScreen() {
  const user = useAuthStore((s) => s.user);
  const t = useThemeStore((s) => s.tokens);
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const expensesQuery = useQuery({
    queryKey: ['friend-expenses', user?.id],
    queryFn: () => getFriendExpenses(user!.id),
    enabled: !!user,
  });
  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    enabled: !!user && showForm,
  });

  const friends = useMemo(() => {
    const list = usersQuery.data ?? [];
    return list.filter((u) => u.id !== user?.id);
  }, [usersQuery.data, user?.id]);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: '',
      amount: '',
      otherUserId: '',
      currency: 'INR',
    },
  });

  const selectedFriend = useWatch({ control, name: 'otherUserId' });

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      createFriendExpense({
        description: values.description.trim(),
        original_amount: values.amount,
        original_currency: values.currency.toUpperCase(),
        payer_user_id: user!.id,
        other_user_id: Number(values.otherUserId),
        date: todayISO(),
        actor_user_id: user!.id,
      }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['friend-expenses'] }),
        qc.invalidateQueries({ queryKey: ['summary'] }),
        qc.invalidateQueries({ queryKey: ['activity'] }),
      ]);
      reset();
      setShowForm(false);
    },
    onError: (e) => {
      Alert.alert('Could not add', e instanceof ApiError ? e.detail : String(e));
    },
  });

  if (expensesQuery.isLoading) {
    return (
      <Screen inTabs>
        <ListSkeleton />
      </Screen>
    );
  }
  if (expensesQuery.isError) {
    return (
      <ErrorView
        message={
          expensesQuery.error instanceof Error ? expensesQuery.error.message : 'Failed to load'
        }
        onRetry={() => void expensesQuery.refetch()}
      />
    );
  }

  const expenses = expensesQuery.data ?? [];

  return (
    <Screen
      inTabs
      scroll
      keyboard
      refreshing={expensesQuery.isRefetching}
      onRefresh={() => expensesQuery.refetch()}
    >
      <View style={styles.header}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <AppText variant="display">Friends</AppText>
          <AppText muted variant="bodySm" style={{ marginTop: 2 }}>
            Split 50/50 with someone outside a group.
          </AppText>
        </View>
        <Button
          title={showForm ? 'Cancel' : 'Add expense'}
          variant={showForm ? 'secondary' : 'primary'}
          onPress={() => setShowForm((v) => !v)}
          style={{ minWidth: 120 }}
        />
      </View>

      {showForm ? (
        <Card elevated="md" style={{ gap: 12, marginBottom: 16 }}>
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, value } }) => (
              <TextField
                label="Description"
                value={value}
                onChangeText={onChange}
                error={errors.description?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="amount"
            render={({ field: { onChange, value } }) => (
              <TextField
                label="Amount"
                keyboardType="decimal-pad"
                value={value}
                onChangeText={onChange}
                error={errors.amount?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="currency"
            render={({ field: { onChange, value } }) => (
              <CurrencyPicker
                label="Currency"
                value={value}
                onChange={onChange}
                error={errors.currency?.message}
              />
            )}
          />
          <AppText muted variant="overline">
            Friend
          </AppText>
          <View style={{ gap: 8 }}>
            {usersQuery.isLoading ? (
              <AppText muted>Loading friends…</AppText>
            ) : friends.length === 0 ? (
              <AppText muted>No other users found yet.</AppText>
            ) : (
              friends.map((f) => {
                const selected = selectedFriend === String(f.id);
                return (
                  <Pressable
                    key={f.id}
                    onPress={() => setValue('otherUserId', String(f.id), { shouldValidate: true })}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[
                      styles.friendPick,
                      {
                        borderColor: selected ? t.brand500 : t.cardBorder,
                        backgroundColor: selected ? t.brand50 : t.pageBg,
                      },
                    ]}
                  >
                    <Avatar name={f.name} seed={f.id} size={36} avatarUrl={f.avatar_url} />
                    <AppText style={{ flex: 1, fontWeight: '700' }} numberOfLines={1}>
                      {f.name}
                    </AppText>
                    {selected ? (
                      <AppText style={{ color: t.brand600, fontWeight: '800' }} variant="caption">
                        Selected
                      </AppText>
                    ) : null}
                  </Pressable>
                );
              })
            )}
            {errors.otherUserId ? (
              <AppText style={{ color: t.danger }} variant="caption">
                {errors.otherUserId.message}
              </AppText>
            ) : null}
          </View>
          <Button
            title="Save friend expense"
            loading={createMutation.isPending}
            onPress={handleSubmit((v) => createMutation.mutate(v))}
          />
        </Card>
      ) : null}

      {expenses.length === 0 ? (
        <EmptyView
          compact
          icon="people-outline"
          title="No friend expenses"
          message="Add a 50/50 expense with another user."
          actionLabel="Add expense"
          onAction={() => setShowForm(true)}
        />
      ) : (
        <View style={{ gap: 10 }}>
          {expenses.map((e) => (
            <Card key={e.id} elevated="sm">
              <AppText variant="body" style={{ fontWeight: '700' }}>
                {e.description}
              </AppText>
              <AppText muted variant="bodySm" style={{ marginTop: 4 }}>
                {formatMoney(e.total_amount, e.original_currency)} · {e.date}
              </AppText>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: space.lg,
  },
  friendPick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    minHeight: 56,
  },
});
