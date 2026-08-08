import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildExpensePayload, shiftISODate } from './validation';

const base = {
  values: {
    description: 'Dinner',
    amount: '100',
    currency: 'INR',
    fxRate: '1',
    date: '2026-08-08',
    category: 'Food & Drink',
    isNegative: false,
  },
  payerId: 1,
  multiplePayers: false,
  paidByAmounts: {},
  splitType: 'equal' as const,
  splitAmong: [1, 2],
  splitDetails: {},
  actorUserId: 1,
  groupCurrency: 'INR',
};

describe('buildExpensePayload', () => {
  it('builds equal-split payload without split_details', () => {
    const payload = buildExpensePayload(base);
    assert.equal(payload.split_type, 'equal');
    assert.equal(payload.split_details, null);
    assert.equal(payload.paid_by['1'], 100);
    assert.deepEqual(payload.split_among, [1, 2]);
  });

  it('rejects percentages that do not sum to 100', () => {
    assert.throws(
      () =>
        buildExpensePayload({
          ...base,
          splitType: 'percentage',
          splitDetails: { '1': '40', '2': '40' },
        }),
      /100%/,
    );
  });

  it('accepts exact amounts that sum to total', () => {
    const payload = buildExpensePayload({
      ...base,
      splitType: 'exact',
      splitDetails: { '1': '60', '2': '40' },
    });
    assert.equal(payload.split_details?.['1'], '60');
  });

  it('signs refunds negative', () => {
    const payload = buildExpensePayload({
      ...base,
      values: { ...base.values, isNegative: true, amount: '25' },
    });
    assert.equal(payload.original_amount, -25);
    assert.equal(payload.is_negative, true);
  });

  it('validates multi-payer sum', () => {
    assert.throws(
      () =>
        buildExpensePayload({
          ...base,
          multiplePayers: true,
          paidByAmounts: { '1': '40', '2': '40' },
        }),
      /sum to/,
    );

    const payload = buildExpensePayload({
      ...base,
      multiplePayers: true,
      paidByAmounts: { '1': '60', '2': '40' },
    });
    assert.equal(payload.paid_by['1'], 60);
    assert.equal(payload.paid_by['2'], 40);
  });
});

describe('shiftISODate', () => {
  it('shifts by days', () => {
    assert.equal(shiftISODate('2026-08-08', -1), '2026-08-07');
  });
});
