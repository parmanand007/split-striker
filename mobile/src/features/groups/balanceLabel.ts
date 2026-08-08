import { formatSignedMoney } from '@/src/utils/format';

/** Format a group balance for list rows. Backend balance is the source of truth. */
export function formatGroupBalanceLabel(
  balance: string | number | undefined,
  currency: string,
): string {
  if (balance == null) return 'Open';
  const n = typeof balance === 'number' ? balance : Number(balance);
  if (Number.isNaN(n) || Math.abs(n) < 0.005) return 'settled';
  return formatSignedMoney(n, currency);
}
