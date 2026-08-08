import { useQuery } from '@tanstack/react-query';
import { getGroups } from '@/src/api/groups';
import { getUserActivity, getUserSummary } from '@/src/api/users';
import { useAuthStore } from '@/src/stores/authStore';
import {
  computeNetBalances,
  countGroupsOwed,
  countGroupsOwing,
  isSettledUp,
  mergeGroupRows,
  recentExpensesFromActivity,
} from './compute';

export function useDashboard() {
  const user = useAuthStore((s) => s.user);

  const summaryQuery = useQuery({
    queryKey: ['summary', user?.id],
    queryFn: () => getUserSummary(user!.id),
    enabled: !!user,
  });

  const groupsQuery = useQuery({
    queryKey: ['groups'],
    queryFn: getGroups,
    enabled: !!user,
  });

  const activityQuery = useQuery({
    // Shared with Activity tab — fetch once, slice on Home.
    queryKey: ['activity', user?.id],
    queryFn: () => getUserActivity(user!.id, 100),
    enabled: !!user,
  });

  const loading =
    !!user &&
    (summaryQuery.isLoading || groupsQuery.isLoading || activityQuery.isLoading);

  const error =
    summaryQuery.error || groupsQuery.error || activityQuery.error || null;

  const refreshing =
    summaryQuery.isRefetching || groupsQuery.isRefetching || activityQuery.isRefetching;

  const refresh = async () => {
    await Promise.all([
      summaryQuery.refetch(),
      groupsQuery.refetch(),
      activityQuery.refetch(),
    ]);
  };

  const summary = summaryQuery.data;
  const groups = groupsQuery.data ?? [];
  const activity = activityQuery.data ?? [];

  const netBalances = summary ? computeNetBalances(summary) : [];
  const settled = summary ? isSettledUp(summary) : true;
  const groupRows = summary ? mergeGroupRows(groups, summary.group_balances ?? []) : [];
  const recentExpenses = recentExpensesFromActivity(activity, 8);
  const recentActivity = activity.slice(0, 12);

  return {
    user,
    loading,
    error,
    refreshing,
    refresh,
    summary,
    groups,
    groupRows,
    netBalances,
    settled,
    recentExpenses,
    recentActivity,
    owedGroupCount: summary ? countGroupsOwed(summary.group_balances ?? []) : 0,
    owingGroupCount: summary ? countGroupsOwing(summary.group_balances ?? []) : 0,
    hasGroups: groups.length > 0,
  };
}
