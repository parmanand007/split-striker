import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatActivityTime,
  formatMoney,
  formatSignedMoney,
  greetingForNow,
  sumCurrencyMap,
} from './format';

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
  it('uses device-local hour bands', () => {
    assert.equal(greetingForNow(new Date(2026, 0, 1, 5, 0, 0)), 'Good morning');
    assert.equal(greetingForNow(new Date(2026, 0, 1, 11, 59, 0)), 'Good morning');
    assert.equal(greetingForNow(new Date(2026, 0, 1, 12, 0, 0)), 'Good afternoon');
    assert.equal(greetingForNow(new Date(2026, 0, 1, 16, 59, 0)), 'Good afternoon');
    assert.equal(greetingForNow(new Date(2026, 0, 1, 17, 0, 0)), 'Good evening');
    assert.equal(greetingForNow(new Date(2026, 0, 1, 20, 59, 0)), 'Good evening');
    assert.equal(greetingForNow(new Date(2026, 0, 1, 21, 0, 0)), 'Good night');
    assert.equal(greetingForNow(new Date(2026, 0, 1, 3, 0, 0)), 'Good night');
  });
});

describe('formatActivityTime', () => {
  it('formats today and older dates in local time', () => {
    const now = new Date(2026, 7, 9, 12, 0, 0); // Aug 9 2026 local
    const today = new Date(2026, 7, 9, 22, 15, 0);
    const yesterday = new Date(2026, 7, 8, 19, 40, 0);
    const older = new Date(2026, 7, 6, 16, 30, 0);
    assert.match(formatActivityTime(today.toISOString(), now), /^Today,/);
    assert.match(formatActivityTime(yesterday.toISOString(), now), /^Yesterday,/);
    assert.match(formatActivityTime(older.toISOString(), now), /Aug 6/);
  });
});
