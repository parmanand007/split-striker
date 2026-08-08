import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@/src/components/ui/Screen';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { ErrorView } from '@/src/components/ui/StateViews';
import { AppText } from '@/src/components/ui/AppText';
import { Avatar } from '@/src/components/ui/Avatar';
import { useThemeStore } from '@/src/stores/themeStore';
import { useGreeting } from '@/src/hooks/useGreeting';
import { useDashboard } from '@/src/features/dashboard/useDashboard';
import { HomeSkeleton } from '@/src/features/dashboard/HomeSkeleton';
import {
  formatCurrencyMap,
  formatNetBalance,
} from '@/src/features/dashboard/compute';
import { activityIconName, activityTitle } from '@/src/utils/activity';
import { formatActivityTime, formatMoney, formatSignedMoney } from '@/src/utils/format';
import { ApiError } from '@/src/types/api';
import type { Group } from '@/src/types/api';
import { fonts } from '@/src/theme/typography';
import { motion, shadow } from '@/src/theme/tokens';

const GROUP_COLORS = ['#be1240', '#c2410c', '#0f766e', '#b45309', '#9f0e30', '#e63c50'];

export default function HomeScreen() {
  const t = useThemeStore((s) => s.tokens);
  const router = useRouter();
  const greeting = useGreeting();
  const dash = useDashboard();

  if (!dash.user || dash.loading) {
    return (
      <Screen inTabs>
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
    <Screen
      inTabs
      scroll
      refreshing={dash.refreshing}
      onRefresh={() => void dash.refresh()}
    >
      <View style={styles.headerRow} testID="home-header">
        <View style={styles.headerLeft}>
          <Avatar name={dash.user.name} seed={dash.user.id} size={44} avatarUrl={dash.user.avatar_url} />
          <View style={{ flex: 1 }}>
            <AppText muted variant="caption" style={{ fontFamily: fonts.semibold }}>
              {greeting}
            </AppText>
            <AppText
              variant="title"
              numberOfLines={1}
              testID="home-user-name"
              accessibilityLabel={dash.user.name}
              style={styles.name}
            >
              {dash.user.name}
            </AppText>
          </View>
        </View>
        <LinearGradient
          colors={[t.brand50, t.cardBg]}
          style={[styles.netBox, { borderColor: t.cardBorder }]}
        >
          <AppText variant="overline" muted>
            Net balance
          </AppText>
          {dash.settled || dash.netBalances.length === 0 ? (
            <AppText muted variant="titleSm" style={{ fontSize: 15 }}>
              Settled
            </AppText>
          ) : (
            dash.netBalances.slice(0, 2).map((n) => (
              <AppText
                key={n.currency}
                variant="money"
                style={{
                  fontSize: 15,
                  color: n.net >= 0 ? t.positive : t.negative,
                }}
              >
                {formatNetBalance(n)}
              </AppText>
            ))
          )}
        </LinearGradient>
      </View>

      <View style={styles.statsRow}>
        <Card elevated="md" style={styles.statCard}>
          <AppText variant="overline" muted>
            You are owed
          </AppText>
          <AppText
            variant="money"
            style={{
              color:
                Object.keys(summary.total_owed).length === 0 ? t.textMuted : t.positive,
              marginTop: 8,
            }}
            numberOfLines={2}
          >
            {formatCurrencyMap(summary.total_owed)}
          </AppText>
          <AppText muted variant="caption" style={{ marginTop: 6 }}>
            across {dash.owedGroupCount} group(s)
          </AppText>
        </Card>
        <Card elevated="md" style={styles.statCard}>
          <AppText variant="overline" muted>
            You owe
          </AppText>
          <AppText
            variant="money"
            style={{
              color:
                Object.keys(summary.total_owing).length === 0 ? t.textMuted : t.negative,
              marginTop: 8,
            }}
            numberOfLines={2}
          >
            {formatCurrencyMap(summary.total_owing)}
          </AppText>
          <AppText muted variant="caption" style={{ marginTop: 6 }}>
            across {dash.owingGroupCount} group(s)
          </AppText>
        </Card>
      </View>

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
          icon="checkmark-done"
          label="Review"
          color={t.brand700}
          onPress={() => router.push('/expenses/review')}
        />
      </View>

      {!dash.hasGroups ? (
        <Card
          elevated="md"
          padded={false}
          style={[styles.emptyCard, { borderColor: t.brand100, borderWidth: 1.5, borderStyle: 'dashed' }]}
        >
          <LinearGradient colors={[t.brand50, t.cardBg]} style={styles.emptyGlow}>
            <View style={[styles.emptyIcon, { backgroundColor: t.brand500 }]}>
              <Ionicons name="flash" size={22} color="#fff" />
            </View>
            <AppText variant="titleSm">No groups yet</AppText>
            <AppText muted variant="bodySm" style={styles.emptyBody}>
              Create a group to start splitting expenses with friends.
            </AppText>
            <Button
              title="Create group"
              fullWidth={false}
              onPress={() => router.push('/groups/create')}
              style={{ marginTop: 14 }}
              testID="home-create-group"
            />
          </LinearGradient>
        </Card>
      ) : (
        <>
          <SectionHeader
            title="By group"
            actionLabel="See all"
            onAction={() => router.push('/(tabs)/groups')}
          />
          <Card elevated="sm" padded={false} style={{ paddingVertical: 4 }}>
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
                    <AppText style={styles.groupIconText}>
                      {group.emoji || group.name.slice(0, 1).toUpperCase()}
                    </AppText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText
                      style={{ fontFamily: fonts.bold, fontSize: 14 }}
                      numberOfLines={1}
                    >
                      {group.name}
                    </AppText>
                    <AppText muted variant="caption">
                      {(group.members?.length ?? 0)} members · {currency}
                    </AppText>
                  </View>
                  <AppText
                    variant="caption"
                    style={{
                      color:
                        n > 0.005 ? t.positive : n < -0.005 ? t.negative : t.textMuted,
                      fontFamily: fonts.bold,
                      marginRight: 4,
                    }}
                  >
                    {Math.abs(n) < 0.005
                      ? 'settled'
                      : formatSignedMoney(balance, currency)}
                  </AppText>
                  <Ionicons name="chevron-forward" size={16} color={t.textMuted} />
                </Pressable>
              );
            })}
          </Card>
        </>
      )}

      <SectionHeader
        title="Recent expenses"
        actionLabel={dash.recentExpenses.length ? 'Activity' : undefined}
        onAction={
          dash.recentExpenses.length ? () => router.push('/(tabs)/activity') : undefined
        }
      />
      {dash.recentExpenses.length === 0 ? (
        <Card elevated="sm">
          <AppText muted>No expenses yet. Add one from a group to see it here.</AppText>
        </Card>
      ) : (
        <Card elevated="sm" padded={false} style={{ paddingVertical: 4 }}>
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
                <AppText style={{ fontFamily: fonts.bold, fontSize: 14 }} numberOfLines={1}>
                  {item.description}
                </AppText>
                <AppText muted variant="caption">
                  {item.actorName || 'Someone'} · {formatActivityTime(item.createdAt)}
                </AppText>
              </View>
              <AppText style={{ fontFamily: fonts.bold }}>
                {formatMoney(item.amount, item.currency)}
              </AppText>
            </Pressable>
          ))}
        </Card>
      )}

      <SectionHeader
        title="Recent activity"
        actionLabel={dash.recentActivity.length ? 'See all' : undefined}
        onAction={
          dash.recentActivity.length ? () => router.push('/(tabs)/activity') : undefined
        }
      />
      {dash.recentActivity.length === 0 ? (
        <Card elevated="sm">
          <AppText muted>Activity from your groups will show up here.</AppText>
        </Card>
      ) : (
        <Card elevated="sm" padded={false} style={{ paddingVertical: 4 }}>
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
                  <AppText style={{ fontFamily: fonts.semibold }} numberOfLines={2}>
                    {activityTitle(log)}
                  </AppText>
                  <AppText muted variant="caption" style={{ marginTop: 2 }}>
                    {formatActivityTime(log.created_at)}
                  </AppText>
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
      <AppText variant="titleSm">{title}</AppText>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <AppText style={{ color: t.brand500, fontFamily: fonts.bold, fontSize: 13 }}>
            {actionLabel}
          </AppText>
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
          opacity: disabled ? 0.4 : pressed ? 0.88 : 1,
          transform: [{ scale: pressed ? motion.pressScale : 1 }],
          ...shadow('sm'),
        },
      ]}
    >
      <LinearGradient colors={[`${color}28`, `${color}12`]} style={styles.quickIcon}>
        <Ionicons name={icon} size={18} color={color} />
      </LinearGradient>
      <AppText
        variant="caption"
        style={{ fontFamily: fonts.bold, fontSize: 12 }}
        numberOfLines={1}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 16,
  },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { marginTop: 1 },
  netBox: {
    alignItems: 'flex-end',
    maxWidth: '42%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCard: { flex: 1, minHeight: 104 },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  quickAction: {
    width: '48%',
    flexGrow: 0,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    minHeight: 76,
  },
  quickIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 12,
  },
  emptyCard: {
    marginBottom: 4,
    padding: 0,
  },
  emptyGlow: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 18,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyBody: { textAlign: 'center', marginTop: 6, paddingHorizontal: 8 },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 56,
  },
  groupIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupIconText: { color: '#fff', fontFamily: fonts.extrabold, fontSize: 14 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 56,
  },
  expenseDot: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
