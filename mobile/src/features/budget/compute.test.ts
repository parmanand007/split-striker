import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { budgetProgress, computeGroupSpent } from './compute';
import type { Expense } from '@/src/types/api';

function exp(partial: Partial<Expense> & { total_amount: string }): Expense {
  return {
    id: 1,
    group_id: 1,
    description: 'x',
    original_amount: partial.total_amount,
    original_currency: 'INR',
    fx_rate: '1',
    total_amount: partial.total_amount,
    paid_by: {},
    split_type: 'equal',
    split_amounts: {},
    split_raw: null,
    category: null,
    date: '2026-01-01',
    created_at: '',
    updated_at: null,
    deleted: false,
    is_negative: false,
    recurrence_rule: null,
    recurrence_end_date: null,
    parent_expense_id: null,
    ...partial,
  };
}

describe('computeGroupSpent', () => {
  it('sums non-deleted expenses', () => {
    const total = computeGroupSpent([
      exp({ total_amount: '100' }),
      exp({ id: 2, total_amount: '50', deleted: true }),
      exp({ id: 3, total_amount: '-20', is_negative: true }),
    ]);
    assert.equal(total, 80);
  });
});

describe('budgetProgress', () => {
  it('tracks remaining and overspend', () => {
    assert.equal(budgetProgress(100, 65).pct, 65);
    assert.equal(budgetProgress(100, 65).remaining, 35);
    assert.equal(budgetProgress(100, 120).exceeded, true);
    assert.equal(budgetProgress(100, 120).over, 20);
  });
});
