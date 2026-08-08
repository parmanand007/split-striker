import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/src/components/ui/Screen';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { ErrorView } from '@/src/components/ui/StateViews';
import { useThemeStore } from '@/src/stores/themeStore';
import { useGreeting } from '@/src/hooks/useGreeting';
import { useDashboard } from '@/src/features/dashboard/useDashboard';
import { HomeSkeleton } from '@/src/features/dashboard/HomeSkeleton';
import {
  formatCurrencyMap,
  formatNetBalance,
} from '@/src/features/dashboard/compute';
import { activityIconName, activityTitle } from '@/src/utils/activity';
import { formatMoney, formatSignedMoney, relativeTime } from '@/src/utils/format';
import { ApiError } from '@/src/types/api';
import type { Group } from '@/src/types/api';

// Match web Sidebar GROUP_COLORS
const GROUP_COLORS = ['#8b5cf6', '#0ea5e9', '#f59e0b', '#f43f5e', '#14b8a6', '#f97316'];

export default function HomeScreen() {
  const t = useThemeStore((s) => s.tokens);
  const router = useRouter();
  const greeting = useGreeting();
  const dash = useDashboard();

  if (!dash.user || dash.loading) {
    return (
      <Screen>
        <HomeSkeleton />
      </Screen>
    );
  }

  if (dash.error || !dash.summary) {
    const message =
      dash.error instanceof ApiError
        ? dash.error.detail
        : dash.error instanceof Error
          ? dash.error.message
          : 'Could not load dashboard';
    return <ErrorView message={message} onRetry={() => void dash.refresh()} framed />;
  }

  const summary = dash.summary;
  const primaryGroup: Group | undefined = dash.groups[0];

  return (
    <Screen scroll refreshing={dash.refreshing} onRefresh={() => void dash.refresh()}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.greeting, { color: t.textMuted }]}>{greeting}</Text>
          <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
            {dash.user.name}
          </Text>
        </View>
        <View style={styles.netBox}>
          <Text style={[styles.netLabel, { color: t.textMuted }]}>Net balance</Text>
          {dash.settled || dash.netBalances.length === 0 ? (
            <Text style={[styles.netValue, { color: t.textMuted }]}>Settled</Text>
          ) : (
            dash.netBalances.slice(0, 2).map((n) => (
              <Text
                key={n.currency}
                style={[
                  styles.netValue,
                  { color: n.net >= 0 ? t.positive : t.negative },
                ]}
              >
                {formatNetBalance(n)}
              </Text>
            ))
          )}
        </View>
      </View>

      {/* Owed / Owe */}
      <View style={styles.statsRow}>
        <Card style={[styles.statCard, { borderBottomColor: t.positive, borderBottomWidth: 3 }]}>
          <Text style={[styles.statLabel, { color: t.textMuted }]}>YOU ARE OWED</Text>
          <Text
            style={[
              styles.statValue,
              {
                color:
                  Object.keys(summary.total_owed).length === 0 ? t.textMuted : t.positive,
              },
            ]}
            numberOfLines={2}
          >
            {formatCurrencyMap(summary.total_owed)}
          </Text>
          <Text style={[styles.statSub, { color: t.textMuted }]}>
            across {dash.owedGroupCount} group(s)
          </Text>
        </Card>
        <Card style={[styles.statCard, { borderBottomColor: t.negative, borderBottomWidth: 3 }]}>
          <Text style={[styles.statLabel, { color: t.textMuted }]}>YOU OWE</Text>
          <Text
            style={[
              styles.statValue,
              {
                color:
                  Object.keys(summary.total_owing).length === 0 ? t.textMuted : t.negative,
              },
            ]}
            numberOfLines={2}
          >
            {formatCurrencyMap(summary.total_owing)}
          </Text>
          <Text style={[styles.statSub, { color: t.textMuted }]}>
            across {dash.owingGroupCount} group(s)
          </Text>
        </Card>
      </View>

      {/* Quick actions */}
      <View style={styles.actions}>
        <QuickAction
          icon="add-circle"
          label="New group"
          color={t.brand500}
          onPress={() => router.push('/groups/create')}
        />
        <QuickAction
          icon="people"
          label="Groups"
          color={t.brand600}
          onPress={() => router.push('/(tabs)/groups')}
        />
        <QuickAction
          icon="receipt"
          label="Add expense"
          color={t.brand400}
          disabled={!primaryGroup}
          onPress={() => {
            if (!primaryGroup) return;
            router.push({
              pathname: '/expenses/create',
              params: { groupId: String(primaryGroup.id) },
            });
          }}
        />
        <QuickAction
          icon="swap-horizontal"
          label="Settle"
          color={t.positive}
          disabled={!primaryGroup}
          onPress={() => {
            if (!primaryGroup) return;
            router.push(`/groups/${primaryGroup.id}/settle`);
          }}
        />
      </View>

      {/* Empty groups */}
      {!dash.hasGroups ? (
        <Card style={[styles.emptyCard, { borderColor: t.cardBorder, borderStyle: 'dashed' }]}>
          <View style={[styles.emptyIcon, { backgroundColor: t.brand50 }]}>
            <Ionicons name="flash" size={22} color={t.brand500} />
          </View>
          <Text style={[styles.emptyTitle, { color: t.text }]}>No groups yet</Text>
          <Text style={[styles.emptyBody, { color: t.textMuted }]}>
            Create a group to start splitting expenses with friends.
          </Text>
          <Button
            title="Create group"
            onPress={() => router.push('/groups/create')}
            style={{ marginTop: 14, alignSelf: 'stretch' }}
          />
        </Card>
      ) : (
        <>
          {/* Groups summary */}
          <SectionHeader
            title="By group"
            actionLabel="See all"
            onAction={() => router.push('/(tabs)/groups')}
          />
          <Card style={{ paddingVertical: 4 }}>
            {dash.groupRows.map(({ group, balance, currency }, idx) => {
              const n = Number(balance);
              const color = GROUP_COLORS[group.id % GROUP_COLORS.length];
              return (
                <Pressable
                  key={group.id}
                  onPress={() => router.push(`/groups/${group.id}`)}
                  style={({ pressed }) => [
                    styles.groupRow,
                    idx > 0 && {
                      borderTopWidth: StyleSheet.hairlineWidth,
                      borderTopColor: t.cardBorder,
                    },
                    { opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <View style={[styles.groupIcon, { backgroundColor: color }]}>
                    <Text style={styles.groupIconText}>
                      {group.emoji || group.name.slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.groupName, { color: t.text }]} numberOfLines={1}>
                      {group.name}
                    </Text>
                    <Text style={{ color: t.textMuted, fontSize: 12 }}>
                      {group.members.length} members · {currency}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color:
                        n > 0.005 ? t.positive : n < -0.005 ? t.negative : t.textMuted,
                      fontWeight: '700',
                      marginRight: 4,
                    }}
                  >
                    {Math.abs(n) < 0.005
                      ? 'settled'
                      : formatSignedMoney(balance, currency)}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={t.textMuted} />
                </Pressable>
              );
            })}
          </Card>
        </>
      )}

      {/* Recent expenses */}
      <SectionHeader
        title="Recent expenses"
        actionLabel={dash.recentExpenses.length ? 'Activity' : undefined}
        onAction={
          dash.recentExpenses.length ? () => router.push('/(tabs)/activity') : undefined
        }
      />
      {dash.recentExpenses.length === 0 ? (
        <Card>
          <Text style={{ color: t.textMuted }}>
            No expenses yet. Add one from a group to see it here.
          </Text>
        </Card>
      ) : (
        <Card style={{ paddingVertical: 4 }}>
          {dash.recentExpenses.map((item, idx) => (
            <Pressable
              key={item.id}
              disabled={!item.groupId}
              onPress={() => {
                if (!item.groupId) return;
                router.push({
                  pathname: '/expenses/[id]',
                  params: {
                    id: String(item.expenseId),
                    groupId: String(item.groupId),
                  },
                });
              }}
              style={({ pressed }) => [
                styles.listRow,
                idx > 0 && {
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: t.cardBorder,
                },
                { opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <View style={[styles.expenseDot, { backgroundColor: t.brand100 }]}>
                <Ionicons name="receipt-outline" size={16} color={t.brand600} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.groupName, { color: t.text }]} numberOfLines={1}>
                  {item.description}
                </Text>
                <Text style={{ color: t.textMuted, fontSize: 12 }}>
                  {item.actorName || 'Someone'} · {relativeTime(item.createdAt)}
                </Text>
              </View>
              <Text style={{ color: t.text, fontWeight: '700' }}>
                {formatMoney(item.amount, item.currency)}
              </Text>
            </Pressable>
          ))}
        </Card>
      )}

      {/* Recent activity */}
      <SectionHeader
        title="Recent activity"
        actionLabel={dash.recentActivity.length ? 'See all' : undefined}
        onAction={
          dash.recentActivity.length ? () => router.push('/(tabs)/activity') : undefined
        }
      />
      {dash.recentActivity.length === 0 ? (
        <Card>
          <Text style={{ color: t.textMuted }}>Activity from your groups will show up here.</Text>
        </Card>
      ) : (
        <Card style={{ paddingVertical: 4 }}>
          {dash.recentActivity.map((log, idx) => {
            const icon = activityIconName(log);
            const canOpenExpense =
              log.entity_type === 'expense' && log.entity_id != null && log.group_id != null;
            const canOpenGroup = log.group_id != null && !canOpenExpense;

            return (
              <Pressable
                key={log.id}
                onPress={() => {
                  if (canOpenExpense) {
                    router.push({
                      pathname: '/expenses/[id]',
                      params: {
                        id: String(log.entity_id),
                        groupId: String(log.group_id),
                      },
                    });
                    return;
                  }
                  if (canOpenGroup) {
                    router.push(`/groups/${log.group_id}`);
                  }
                }}
                style={({ pressed }) => [
                  styles.listRow,
                  idx > 0 && {
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: t.cardBorder,
                  },
                  { opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <View style={[styles.expenseDot, { backgroundColor: t.brand50 }]}>
                  <Ionicons name={icon} size={16} color={t.brand600} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.text, fontWeight: '600' }} numberOfLines={2}>
                    {activityTitle(log)}
                  </Text>
                  <Text style={{ color: t.textMuted, fontSize: 12, marginTop: 2 }}>
                    {relativeTime(log.created_at)}
                  </Text>
                </View>
                {(canOpenExpense || canOpenGroup) && (
                  <Ionicons name="chevron-forward" size={16} color={t.textMuted} />
                )}
              </Pressable>
            );
          })}
        </Card>
      )}
    </Screen>
  );
}

function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const t = useThemeStore((s) => s.tokens);
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.section, { color: t.text }]}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={{ color: t.brand500, fontWeight: '700', fontSize: 13 }}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function QuickAction({
  icon,
  label,
  color,
  onPress,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const t = useThemeStore((s) => s.tokens);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.quickAction,
        {
          backgroundColor: t.cardBg,
          borderColor: t.cardBorder,
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.quickIcon, { backgroundColor: `${color}22` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={{ color: t.text, fontSize: 11, fontWeight: '700' }} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  greeting: { fontSize: 14, fontWeight: '600' },
  name: { fontSize: 28, fontWeight: '800', marginTop: 2 },
  netBox: { alignItems: 'flex-end', maxWidth: '42%' },
  netLabel: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  netValue: { fontSize: 16, fontWeight: '800' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard: { flex: 1, minHeight: 110 },
  statLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  statValue: { fontSize: 18, fontWeight: '800', marginTop: 10 },
  statSub: { fontSize: 11, marginTop: 8 },
  actions: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 72,
  },
  quickIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 8,
  },
  section: { fontSize: 16, fontWeight: '700' },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 28,
    borderWidth: 2,
    marginBottom: 8,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyBody: { fontSize: 13, textAlign: 'center', marginTop: 6, paddingHorizontal: 12 },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    minHeight: 64,
  },
  groupIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupIconText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  groupName: { fontSize: 15, fontWeight: '700' },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    minHeight: 60,
  },
  expenseDot: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
