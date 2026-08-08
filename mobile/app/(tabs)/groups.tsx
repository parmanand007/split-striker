import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getGroups } from '@/src/api/groups';
import { getUserSummary } from '@/src/api/users';
import { useAuthStore } from '@/src/stores/authStore';
import { useThemeStore } from '@/src/stores/themeStore';
import { Screen } from '@/src/components/ui/Screen';
import { EmptyView, ErrorView } from '@/src/components/ui/StateViews';
import { GroupRow } from '@/src/components/groups/GroupRow';
import { GroupListSkeleton } from '@/src/components/groups/GroupSkeleton';
import { formatGroupBalanceLabel } from '@/src/features/groups/balanceLabel';
import { ApiError } from '@/src/types/api';

export default function GroupsScreen() {
  const t = useThemeStore((s) => s.tokens);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  const groupsQuery = useQuery({ queryKey: ['groups'], queryFn: getGroups });
  const summaryQuery = useQuery({
    queryKey: ['summary', user?.id],
    queryFn: () => getUserSummary(user!.id),
    enabled: !!user,
  });

  const balanceByGroup = useMemo(() => {
    const map = new Map<number, { balance: string; currency: string }>();
    for (const b of summaryQuery.data?.group_balances ?? []) {
      map.set(b.group_id, {
        balance: b.balance,
        currency: b.currency || 'INR',
      });
    }
    return map;
  }, [summaryQuery.data]);

  if (groupsQuery.isLoading) {
    return (
      <Screen inTabs>
        <GroupListSkeleton />
      </Screen>
    );
  }

  if (groupsQuery.isError) {
    return (
      <ErrorView
        message={
          groupsQuery.error instanceof ApiError
            ? groupsQuery.error.detail
            : groupsQuery.error instanceof Error
              ? groupsQuery.error.message
              : 'Failed to load groups'
        }
        onRetry={() => void groupsQuery.refetch()}
      />
    );
  }

  const groups = groupsQuery.data ?? [];
  const active = groups.filter((g) => !g.archived);
  const archived = groups.filter((g) => g.archived);

  return (
    <Screen
      inTabs
      scroll
      refreshing={groupsQuery.isRefetching || summaryQuery.isRefetching}
      onRefresh={() => {
        void groupsQuery.refetch();
        void summaryQuery.refetch();
      }}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: t.text }]}>Groups</Text>
          <Text style={{ color: t.textMuted, marginTop: 2 }}>
            {groups.length} group{groups.length === 1 ? '' : 's'}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/groups/create')}
          style={[styles.addBtn, { backgroundColor: t.brand500 }]}
          accessibilityLabel="Create group"
        >
          <Ionicons name="add" size={22} color={t.btnPrimaryText} />
        </Pressable>
      </View>

      {groups.length === 0 ? (
        <EmptyView
          title="No groups yet"
          message="Create a group for a trip, flat, or shared bill."
          actionLabel="Create group"
          onAction={() => router.push('/groups/create')}
        />
      ) : (
        <View style={{ gap: 10 }}>
          {active.map((g) => {
            const bal = balanceByGroup.get(g.id);
            return (
              <GroupRow
                key={g.id}
                group={g}
                balanceLabel={formatGroupBalanceLabel(
                  bal?.balance,
                  bal?.currency || g.currency,
                )}
                onPress={() => router.push(`/groups/${g.id}`)}
              />
            );
          })}

          {archived.length > 0 ? (
            <>
              <Text style={[styles.section, { color: t.textMuted }]}>Archived</Text>
              {archived.map((g) => (
                <GroupRow
                  key={g.id}
                  group={g}
                  balanceLabel="archived"
                  onPress={() => router.push(`/groups/${g.id}`)}
                />
              ))}
            </>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '800' },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginTop: 16,
    marginBottom: 4,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
