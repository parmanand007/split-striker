import { useQuery } from '@tanstack/react-query';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getUserActivity } from '@/src/api/users';
import { useAuthStore } from '@/src/stores/authStore';
import { useThemeStore } from '@/src/stores/themeStore';
import { Screen } from '@/src/components/ui/Screen';
import { Card } from '@/src/components/ui/Card';
import { AppText } from '@/src/components/ui/AppText';
import { EmptyView, ErrorView } from '@/src/components/ui/StateViews';
import { ListSkeleton } from '@/src/components/ui/ListSkeleton';
import { activityIconName, activityTitle } from '@/src/utils/activity';
import { formatActivityTime } from '@/src/utils/format';

export default function ActivityScreen() {
  const user = useAuthStore((s) => s.user);
  const t = useThemeStore((s) => s.tokens);
  const router = useRouter();
  const query = useQuery({
    queryKey: ['activity', user?.id],
    queryFn: () => getUserActivity(user!.id, 100),
    enabled: !!user,
  });

  if (query.isLoading) {
    return (
      <Screen inTabs>
        <ListSkeleton />
      </Screen>
    );
  }
  if (query.isError) {
    return (
      <ErrorView
        message={query.error instanceof Error ? query.error.message : 'Failed'}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const logs = query.data ?? [];

  return (
    <Screen
      inTabs
      scroll
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
    >
      <AppText variant="display" style={{ marginBottom: 4 }}>
        Activity
      </AppText>
      <AppText muted variant="bodySm" style={{ marginBottom: 16 }}>
        Recent expenses, payments, and group updates
      </AppText>
      {logs.length === 0 ? (
        <EmptyView
          compact
          icon="pulse-outline"
          title="No activity yet"
          message="Expenses and payments will show up here."
        />
      ) : (
        <Card elevated="sm" padded={false}>
          {logs.map((log, idx) => {
            const canOpenExpense =
              log.entity_type === 'expense' && log.entity_id != null && log.group_id != null;
            return (
              <Pressable
                key={log.id}
                disabled={!canOpenExpense}
                accessibilityRole={canOpenExpense ? 'button' : undefined}
                onPress={() => {
                  if (!canOpenExpense) return;
                  router.push({
                    pathname: '/expenses/[id]',
                    params: {
                      id: String(log.entity_id),
                      groupId: String(log.group_id),
                    },
                  });
                }}
                style={[
                  styles.row,
                  idx < logs.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: t.cardBorder,
                  },
                ]}
              >
                <View style={[styles.icon, { backgroundColor: t.brand50 }]}>
                  <Ionicons name={activityIconName(log)} size={16} color={t.brand600} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="body" style={{ fontWeight: '600' }} numberOfLines={2}>
                    {activityTitle(log)}
                  </AppText>
                  <AppText muted variant="caption" style={{ marginTop: 4 }}>
                    {formatActivityTime(log.created_at)}
                  </AppText>
                </View>
                {canOpenExpense ? (
                  <Ionicons name="chevron-forward" size={16} color={t.textMuted} />
                ) : null}
              </Pressable>
            );
          })}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 64,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
