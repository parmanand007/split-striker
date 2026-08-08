import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ActivityLog, UserSummary } from '@/src/types/api';
import {
  computeNetBalances,
  countGroupsOwed,
  formatCurrencyMap,
  isSettledUp,
  recentExpensesFromActivity,
} from './compute';

const baseSummary = (partial: Partial<UserSummary>): UserSummary => ({
  user: {
    id: 1,
    name: 'Test',
    email: 't@example.com',
    created_at: '2026-01-01T00:00:00Z',
  },
  total_owed: {},
  total_owing: {},
  group_balances: [],
  ...partial,
});

describe('computeNetBalances', () => {
  it('subtracts owing from owed per currency', () => {
    const nets = computeNetBalances(
      baseSummary({
        total_owed: { INR: '100' },
        total_owing: { INR: '40' },
      }),
    );
    assert.equal(nets.length, 1);
    assert.equal(nets[0].currency, 'INR');
    assert.equal(nets[0].net, 60);
  });
});

describe('isSettledUp', () => {
  it('is true when maps are empty', () => {
    assert.equal(isSettledUp(baseSummary({})), true);
  });

  it('is false when net is nonzero', () => {
    assert.equal(
      isSettledUp(baseSummary({ total_owed: { INR: '10' } })),
      false,
    );
  });
});

describe('countGroupsOwed', () => {
  it('counts positive balances only', () => {
    assert.equal(
      countGroupsOwed([
        { group_id: 1, group_name: 'A', balance: '12' },
        { group_id: 2, group_name: 'B', balance: '-3' },
        { group_id: 3, group_name: 'C', balance: '0' },
      ]),
      1,
    );
  });
});

describe('recentExpensesFromActivity', () => {
  it('keeps only expense create events with entity ids', () => {
    const logs = [
      {
        id: 1,
        group_id: 9,
        actor_user_id: 1,
        actor_name: 'Ada',
        action_type: 'create',
        entity_type: 'expense',
        entity_id: 55,
        details: { description: 'Taxi', amount: '200', currency: 'INR' },
        created_at: '2026-01-02T00:00:00Z',
      },
      {
        id: 2,
        group_id: 9,
        actor_user_id: 1,
        actor_name: 'Ada',
        action_type: 'payment',
        entity_type: 'payment',
        entity_id: 3,
        details: {},
        created_at: '2026-01-02T00:00:00Z',
      },
    ] as ActivityLog[];

    const items = recentExpensesFromActivity(logs);
    assert.equal(items.length, 1);
    assert.equal(items[0].expenseId, 55);
    assert.equal(items[0].description, 'Taxi');
  });
});

describe('formatCurrencyMap', () => {
  it('returns dash for empty', () => {
    assert.equal(formatCurrencyMap({}), '—');
  });
});
