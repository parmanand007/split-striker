import type { ActivityLog, Group, GroupBalanceItem, UserSummary } from '@/src/types/api';
import { formatMoney } from '@/src/utils/format';

export interface NetBalance {
  currency: string;
  net: number;
}

export interface RecentExpenseItem {
  id: number;
  expenseId: number;
  groupId: number | null;
  description: string;
  amount: string;
  currency: string;
  actorName: string | null;
  createdAt: string;
}

/** Net = owed_to_me − I_owe, per currency (backend amounts are source of truth). */
export function computeNetBalances(summary: UserSummary): NetBalance[] {
  const currencies = new Set([
    ...Object.keys(summary.total_owed || {}),
    ...Object.keys(summary.total_owing || {}),
  ]);

  return [...currencies]
    .map((currency) => {
      const owed = Number(summary.total_owed?.[currency] || 0);
      const owing = Number(summary.total_owing?.[currency] || 0);
      return { currency, net: owed - owing };
    })
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
}

export function formatNetBalance(net: NetBalance): string {
  const abs = formatMoney(Math.abs(net.net), net.currency);
  if (net.net > 0.005) return `+${abs}`;
  if (net.net < -0.005) return `-${abs}`;
  return formatMoney(0, net.currency);
}

export function isSettledUp(summary: UserSummary): boolean {
  const nets = computeNetBalances(summary);
  if (!nets.length) return true;
  return nets.every((n) => Math.abs(n.net) < 0.005);
}

export function countGroupsOwed(groupBalances: GroupBalanceItem[]): number {
  return groupBalances.filter((g) => Number(g.balance) > 0.005).length;
}

export function countGroupsOwing(groupBalances: GroupBalanceItem[]): number {
  return groupBalances.filter((g) => Number(g.balance) < -0.005).length;
}

export function mergeGroupRows(groups: Group[], balances: GroupBalanceItem[]) {
  const byId = new Map(balances.map((b) => [b.group_id, b]));
  return groups.map((group) => {
    const bal = byId.get(group.id);
    return {
      group,
      balance: bal?.balance ?? '0',
      currency: bal?.currency || group.currency,
    };
  });
}

/** Recent expenses derived from activity logs (no client balance math). */
export function recentExpensesFromActivity(
  logs: ActivityLog[],
  limit = 8,
): RecentExpenseItem[] {
  return logs
    .filter((l) => l.action_type === 'create' && l.entity_type === 'expense' && l.entity_id != null)
    .slice(0, limit)
    .map((l) => {
      const details = l.details || {};
      return {
        id: l.id,
        expenseId: l.entity_id as number,
        groupId: l.group_id,
        description: String(details.description ?? 'Expense'),
        amount: String(details.amount ?? '0'),
        currency: String(details.currency ?? 'INR'),
        actorName: l.actor_name,
        createdAt: l.created_at,
      };
    });
}

export function formatCurrencyMap(map: Record<string, string> | undefined): string {
  const entries = Object.entries(map || {});
  if (!entries.length) return '—';
  return entries.map(([cur, amt]) => formatMoney(amt, cur)).join(' · ');
}
