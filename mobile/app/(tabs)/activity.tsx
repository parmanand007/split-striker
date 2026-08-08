import { useQuery } from '@tanstack/react-query';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { getUserActivity } from '@/src/api/users';
import { useAuthStore } from '@/src/stores/authStore';
import { useThemeStore } from '@/src/stores/themeStore';
import { Screen } from '@/src/components/ui/Screen';
import { Card } from '@/src/components/ui/Card';
import { EmptyView, ErrorView, LoadingView } from '@/src/components/ui/StateViews';
import { activityTitle } from '@/src/utils/activity';
import { relativeTime } from '@/src/utils/format';

export default function ActivityScreen() {
  const user = useAuthStore((s) => s.user);
  const t = useThemeStore((s) => s.tokens);
  const router = useRouter();
  const query = useQuery({
    queryKey: ['activity', user?.id],
    queryFn: () => getUserActivity(user!.id, 100),
    enabled: !!user,
  });

  if (query.isLoading) return <LoadingView />;
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
      <Text style={[styles.title, { color: t.text }]}>Activity</Text>
      {logs.length === 0 ? (
        <EmptyView
          compact
          title="No activity yet"
          message="Expenses and payments will show up here."
        />
      ) : (
        <Card>
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
                <Text style={{ color: t.text, fontWeight: '600' }}>{activityTitle(log)}</Text>
                <Text style={{ color: t.textMuted, fontSize: 12, marginTop: 4 }}>
                  {relativeTime(log.created_at)}
                </Text>
              </Pressable>
            );
          })}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', marginBottom: 16 },
  row: { paddingVertical: 12, minHeight: 56, justifyContent: 'center' },
});
