import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatGroupBalanceLabel } from './balanceLabel';

describe('formatGroupBalanceLabel', () => {
  it('returns settled for near-zero', () => {
    assert.equal(formatGroupBalanceLabel('0.001', 'INR'), 'settled');
    assert.equal(formatGroupBalanceLabel('0', 'INR'), 'settled');
  });

  it('returns Open when missing', () => {
    assert.equal(formatGroupBalanceLabel(undefined, 'INR'), 'Open');
  });

  it('formats nonzero balances with sign', () => {
    const pos = formatGroupBalanceLabel('12.5', 'USD');
    assert.equal(pos.startsWith('+'), true);
    const neg = formatGroupBalanceLabel('-8', 'USD');
    assert.equal(neg.startsWith('-'), true);
  });
});
