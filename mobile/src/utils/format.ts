import { formatDistanceToNow, parseISO } from 'date-fns';

export function formatMoney(amount: string | number, currency = 'INR'): string {
  const n = typeof amount === 'number' ? amount : Number(amount);
  if (Number.isNaN(n)) return `${currency} ${amount}`;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

export function formatSignedMoney(amount: string | number, currency = 'INR'): string {
  const n = typeof amount === 'number' ? amount : Number(amount);
  const abs = formatMoney(Math.abs(n), currency);
  if (n > 0.005) return `+${abs}`;
  if (n < -0.005) return `-${abs}`;
  return formatMoney(0, currency);
}

export function relativeTime(iso: string): string {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return iso;
  }
}

export function greetingForNow(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Local calendar date as YYYY-MM-DD (not UTC). */
export function todayISO(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function sumCurrencyMap(map: Record<string, string> | undefined): string {
  if (!map) return '—';
  const entries = Object.entries(map);
  if (!entries.length) return '—';
  return entries.map(([cur, amt]) => formatMoney(amt, cur)).join(' · ');
}
