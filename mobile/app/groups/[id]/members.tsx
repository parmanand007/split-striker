import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { addMember, getGroup, removeMember } from '@/src/api/groups';
import { getBalances } from '@/src/api/balances';
import { getUsers } from '@/src/api/users';
import { useAuthStore } from '@/src/stores/authStore';
import { useThemeStore } from '@/src/stores/themeStore';
import { Screen } from '@/src/components/ui/Screen';
import { TextField } from '@/src/components/ui/TextField';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { ErrorView, LoadingView } from '@/src/components/ui/StateViews';
import { MemberRow } from '@/src/components/groups/MemberRow';
import { formatGroupBalanceLabel } from '@/src/features/groups/balanceLabel';
import { ApiError } from '@/src/types/api';

export default function GroupMembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Number(id);
  const user = useAuthStore((s) => s.user);
  const t = useThemeStore((s) => s.tokens);
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [removingId, setRemovingId] = useState<number | null>(null);

  const groupQuery = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => getGroup(groupId),
    enabled: Number.isFinite(groupId),
  });
  const balancesQuery = useQuery({
    queryKey: ['balances', groupId],
    queryFn: () => getBalances(groupId),
    enabled: Number.isFinite(groupId),
  });
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: getUsers });

  const memberIds = useMemo(
    () => new Set((groupQuery.data?.members ?? []).map((m) => m.id)),
    [groupQuery.data],
  );

  const balanceByUser = useMemo(() => {
    const map = new Map<number, string>();
    for (const b of balancesQuery.data?.balances ?? []) map.set(b.user_id, b.balance);
    return map;
  }, [balancesQuery.data]);

  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (usersQuery.data ?? [])
      .filter((u) => !memberIds.has(u.id))
      .filter((u) => {
        if (!q) return true;
        return (
          u.name.toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q)
        );
      });
  }, [usersQuery.data, memberIds, search]);

  const invalidate = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['group', groupId] }),
      qc.invalidateQueries({ queryKey: ['groups'] }),
      qc.invalidateQueries({ queryKey: ['balances', groupId] }),
      qc.invalidateQueries({ queryKey: ['summary'] }),
      qc.invalidateQueries({ queryKey: ['group-activity', groupId] }),
    ]);
  };

  const addMutation = useMutation({
    mutationFn: (userId: number) => addMember(groupId, userId),
    onSuccess: async () => {
      setSearch('');
      await invalidate();
    },
    onError: (e) =>
      Alert.alert('Could not add member', e instanceof ApiError ? e.detail : String(e)),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: number) => removeMember(groupId, userId),
    onMutate: (userId) => setRemovingId(userId),
    onSettled: () => setRemovingId(null),
    onSuccess: async (_data, userId) => {
      await invalidate();
      if (userId === user?.id) {
        router.replace('/(tabs)/groups');
      }
    },
    onError: (e) =>
      Alert.alert('Could not remove member', e instanceof ApiError ? e.detail : String(e)),
  });

  const confirmRemove = (userId: number, name: string, isSelf: boolean) => {
    Alert.alert(
      isSelf ? 'Leave group?' : 'Remove member?',
      isSelf
        ? 'You can only leave if your balance is settled.'
        : `Remove ${name}? They must have a settled balance.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isSelf ? 'Leave' : 'Remove',
          style: 'destructive',
          onPress: () => removeMutation.mutate(userId),
        },
      ],
    );
  };

  if (groupQuery.isLoading) return <LoadingView />;
  if (groupQuery.isError || !groupQuery.data) {
    return (
      <ErrorView
        message={
          groupQuery.error instanceof ApiError
            ? groupQuery.error.detail
            : 'Group not found'
        }
        onRetry={() => void groupQuery.refetch()}
      />
    );
  }

  const group = groupQuery.data;
  const isOwner = group.created_by_id === user?.id;
  const currency = group.currency;

  return (
    <>
      <Stack.Screen options={{ title: 'Members' }} />
      <Screen
        withHeader
        scroll
        keyboard
        refreshing={groupQuery.isRefetching}
        onRefresh={() => {
          void groupQuery.refetch();
          void balancesQuery.refetch();
        }}
      >
        <Text style={[styles.heading, { color: t.text }]}>
          {group.members.length} member{group.members.length === 1 ? '' : 's'}
        </Text>

        <View style={{ gap: 10, marginBottom: 20 }}>
          {group.members.map((m) => {
            const bal = balanceByUser.get(m.id);
            const n = bal != null ? Number(bal) : 0;
            const isYou = m.id === user?.id;
            const canRemove =
              !group.archived &&
              (isYou || isOwner) &&
              // Owner deleting themselves is leave; don't allow removing owner via others
              !(m.id === group.created_by_id && !isYou);

            return (
              <MemberRow
                key={m.id}
                user={m}
                isOwner={m.id === group.created_by_id}
                isYou={isYou}
                balanceLabel={formatGroupBalanceLabel(bal, currency)}
                balanceTone={
                  n > 0.005 ? 'positive' : n < -0.005 ? 'negative' : 'neutral'
                }
                actionLabel={isYou ? 'Leave' : 'Remove'}
                actionTone="danger"
                actionIcon={isYou ? 'exit-outline' : 'person-remove-outline'}
                actionPending={removingId === m.id}
                onAction={
                  canRemove
                    ? () => confirmRemove(m.id, m.name, isYou)
                    : undefined
                }
              />
            );
          })}
        </View>

        {!group.archived ? (
          <>
            <Text style={[styles.heading, { color: t.text }]}>Add member</Text>
            <Text style={{ color: t.textMuted, marginBottom: 10 }}>
              Pick an existing user. Or share an invite link from Settings.
            </Text>
            <TextField
              label="Search users"
              value={search}
              onChangeText={setSearch}
              placeholder="Name or email"
              autoCapitalize="none"
            />
            <View style={{ gap: 8, marginTop: 12 }}>
              {usersQuery.isLoading ? (
                <LoadingView label="Loading users…" />
              ) : candidates.length === 0 ? (
                <Card>
                  <Text style={{ color: t.textMuted }}>
                    No matching users to add. Try an invite link from Settings.
                  </Text>
                  <Button
                    title="Open settings"
                    variant="secondary"
                    style={{ marginTop: 12 }}
                    onPress={() => router.push(`/groups/${groupId}/settings`)}
                  />
                </Card>
              ) : (
                candidates.slice(0, 20).map((u) => (
                  <MemberRow
                    key={u.id}
                    user={u}
                    actionLabel="Add"
                    actionTone="brand"
                    actionIcon="person-add-outline"
                    actionPending={addMutation.isPending && addMutation.variables === u.id}
                    onAction={() => addMutation.mutate(u.id)}
                  />
                ))
              )}
            </View>
          </>
        ) : (
          <Card>
            <Text style={{ color: t.textMuted }}>
              This group is archived. Unarchive it in Settings before changing members.
            </Text>
          </Card>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
});
