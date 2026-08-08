import type { Expense } from '@/src/types/api';
import { EXPENSE_CATEGORIES } from '@/src/features/expenses/constants';

/** Spent from non-deleted expenses in group currency (refunds reduce spend). */
export function computeGroupSpent(expenses: Expense[]): number {
  let total = 0;
  for (const e of expenses) {
    if (e.deleted) continue;
    const n = Number(e.total_amount);
    if (!Number.isFinite(n)) continue;
    // is_negative expenses already store negative total_amount from the API
    total += n;
  }
  return total;
}

export function computeCategorySpent(expenses: Expense[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const e of expenses) {
    if (e.deleted) continue;
    const n = Number(e.total_amount);
    if (!Number.isFinite(n)) continue;
    const key = e.category?.trim() || 'Other';
    map[key] = (map[key] || 0) + n;
  }
  return map;
}

export function budgetProgress(budget: number, spent: number) {
  if (budget <= 0) {
    return { pct: 0, remaining: 0, over: Math.max(0, spent), exceeded: spent > 0 };
  }
  const remaining = budget - spent;
  const pct = Math.min(100, Math.max(0, (spent / budget) * 100));
  return {
    pct,
    remaining,
    over: remaining < 0 ? Math.abs(remaining) : 0,
    exceeded: remaining < 0,
  };
}

export function orderedCategoryKeys(spentMap: Record<string, number>, budgets?: Record<string, string> | null) {
  const keys = new Set<string>([
    ...EXPENSE_CATEGORIES,
    ...Object.keys(spentMap),
    ...Object.keys(budgets || {}),
  ]);
  return Array.from(keys).filter(
    (k) => (spentMap[k] || 0) !== 0 || Number(budgets?.[k] || 0) > 0,
  );
}
