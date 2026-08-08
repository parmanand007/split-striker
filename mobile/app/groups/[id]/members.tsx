import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';
import { AppText } from '@/src/components/ui/AppText';
import { fonts } from '@/src/theme/typography';
import { getGroup, removeMember } from '@/src/api/groups';
import { getBalances } from '@/src/api/balances';
import { useAuthStore } from '@/src/stores/authStore';
import { useThemeStore } from '@/src/stores/themeStore';
import { Screen } from '@/src/components/ui/Screen';
import { Card } from '@/src/components/ui/Card';
import { ErrorView } from '@/src/components/ui/StateViews';
import { ListSkeleton } from '@/src/components/ui/ListSkeleton';
import { MemberRow } from '@/src/components/groups/MemberRow';
import { GroupInviteCard } from '@/src/components/groups/GroupInviteCard';
import { formatGroupBalanceLabel } from '@/src/features/groups/balanceLabel';
import { ApiError } from '@/src/types/api';

export default function GroupMembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Number(id);
  const user = useAuthStore((s) => s.user);
  const t = useThemeStore((s) => s.tokens);
  const router = useRouter();
  const qc = useQueryClient();
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

  const balanceByUser = useMemo(() => {
    const map = new Map<number, string>();
    for (const b of balancesQuery.data?.balances ?? []) map.set(b.user_id, b.balance);
    return map;
  }, [balancesQuery.data]);

  const invalidate = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['group', groupId] }),
      qc.invalidateQueries({ queryKey: ['groups'] }),
      qc.invalidateQueries({ queryKey: ['balances', groupId] }),
      qc.invalidateQueries({ queryKey: ['summary'] }),
      qc.invalidateQueries({ queryKey: ['group-activity', groupId] }),
    ]);
  };

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

  if (groupQuery.isLoading) {
    return (
      <Screen withHeader>
        <ListSkeleton rows={4} />
      </Screen>
    );
  }
  if (groupQuery.isError || !groupQuery.data || !user) {
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
  const isOwner = group.created_by_id === user.id;
  const currency = group.currency;

  return (
    <>
      <Stack.Screen options={{ title: 'Members' }} />
      <Screen
        withHeader
        scroll
        refreshing={groupQuery.isRefetching}
        onRefresh={() => {
          void groupQuery.refetch();
          void balancesQuery.refetch();
        }}
      >
        <AppText style={[styles.heading, { color: t.text }]}>
          {group.members.length} member{group.members.length === 1 ? '' : 's'}
        </AppText>

        <View style={{ gap: 10, marginBottom: 20 }}>
          {group.members.map((m) => {
            const bal = balanceByUser.get(m.id);
            const n = bal != null ? Number(bal) : 0;
            const isYou = m.id === user.id;
            const canRemove =
              !group.archived &&
              (isYou || isOwner) &&
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
          <GroupInviteCard groupId={groupId} actorUserId={user.id} />
        ) : (
          <Card>
            <AppText style={{ color: t.textMuted }}>
              This group is archived. Unarchive it in Settings before inviting new members.
            </AppText>
          </Card>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 18, fontFamily: fonts.extrabold, marginBottom: 8 },
});
