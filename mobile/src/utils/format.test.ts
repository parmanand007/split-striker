import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatMoney, formatSignedMoney, greetingForNow, sumCurrencyMap } from './format';

describe('formatMoney', () => {
  it('formats INR amounts', () => {
    const out = formatMoney('100.5', 'INR');
    assert.match(out, /100/);
    assert.match(out, /₹|INR/);
  });
});

describe('formatSignedMoney', () => {
  it('adds plus for positive balances', () => {
    assert.equal(formatSignedMoney('12.00', 'USD').startsWith('+'), true);
  });

  it('adds minus for negative balances', () => {
    assert.equal(formatSignedMoney('-12.00', 'USD').startsWith('-'), true);
  });
});

describe('todayISO', () => {
  it('uses local calendar date', async () => {
    const { todayISO } = await import('./format');
    const d = new Date(2026, 7, 8, 23, 30, 0); // Aug 8 local
    assert.equal(todayISO(d), '2026-08-08');
  });
});

describe('sumCurrencyMap', () => {
  it('returns dash for empty map', () => {
    assert.equal(sumCurrencyMap({}), '—');
  });
});

describe('greetingForNow', () => {
  it('returns a greeting string', () => {
    assert.match(greetingForNow(new Date('2026-01-01T09:00:00')), /Good/);
  });
});
