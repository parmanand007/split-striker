import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getGroups } from '@/src/api/groups';
import { getUserSummary } from '@/src/api/users';
import { useAuthStore } from '@/src/stores/authStore';
import { useThemeStore } from '@/src/stores/themeStore';
import { Screen } from '@/src/components/ui/Screen';
import { AppText } from '@/src/components/ui/AppText';
import { EmptyView, ErrorView } from '@/src/components/ui/StateViews';
import { GroupRow } from '@/src/components/groups/GroupRow';
import { GroupListSkeleton } from '@/src/components/groups/GroupSkeleton';
import { formatGroupBalanceLabel } from '@/src/features/groups/balanceLabel';
import { ApiError } from '@/src/types/api';
import { shadow, space } from '@/src/theme/tokens';
import * as Haptics from 'expo-haptics';

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
        <View style={{ flex: 1 }}>
          <AppText variant="display">Groups</AppText>
          <AppText muted variant="bodySm" style={{ marginTop: 2 }}>
            {groups.length} group{groups.length === 1 ? '' : 's'}
          </AppText>
        </View>
        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
            router.push('/groups/create');
          }}
          style={[styles.addBtn, shadow('glow')]}
          accessibilityLabel="Create group"
          accessibilityRole="button"
        >
          <LinearGradient
            colors={[t.brand400, t.brand600]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.addGrad}
          >
            <Ionicons name="add" size={22} color={t.btnPrimaryText} />
          </LinearGradient>
        </Pressable>
      </View>

      {groups.length === 0 ? (
        <EmptyView
          icon="people-outline"
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
              <AppText muted variant="overline" style={styles.section}>
                Archived
              </AppText>
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
    marginBottom: space.lg,
    gap: space.md,
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    overflow: 'hidden',
  },
  addGrad: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginTop: space.lg,
    marginBottom: space.xs,
  },
});
