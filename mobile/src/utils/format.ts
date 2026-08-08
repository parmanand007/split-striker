import {
  format,
  formatDistanceToNow,
  isToday,
  isYesterday,
  parseISO,
} from 'date-fns';

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

/** Parse backend ISO timestamps into a local Date (device timezone). */
export function parseLocalDate(iso: string): Date {
  // Backend often stores naive UTC (`2026-08-08T18:30:00` without Z).
  // Treat missing timezone as UTC so device-local conversion is correct.
  const trimmed = iso.trim();
  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(trimmed);
  const normalized = hasZone ? trimmed : `${trimmed}Z`;
  return parseISO(normalized);
}

export function relativeTime(iso: string): string {
  try {
    return formatDistanceToNow(parseLocalDate(iso), { addSuffix: true });
  } catch {
    return iso;
  }
}

/**
 * Activity timestamps in the user's device local timezone.
 * e.g. "Today, 10:15 PM" · "Yesterday, 7:40 PM" · "Aug 6, 4:30 PM" · "Aug 2, 2026 · 8:15 PM"
 */
export function formatActivityTime(iso: string, now = new Date()): string {
  try {
    const d = parseLocalDate(iso);
    const time = format(d, 'h:mm a');
    if (isToday(d)) return `Today, ${time}`;
    if (isYesterday(d)) return `Yesterday, ${time}`;
    if (d.getFullYear() === now.getFullYear()) {
      return `${format(d, 'MMM d')}, ${time}`;
    }
    return `${format(d, 'MMM d, yyyy')} · ${time}`;
  } catch {
    return iso;
  }
}

/**
 * Device-local greeting bands:
 * 05:00–11:59 Good morning
 * 12:00–16:59 Good afternoon
 * 17:00–20:59 Good evening
 * 21:00–04:59 Good night
 */
export function greetingForNow(date = new Date()): string {
  const h = date.getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 21) return 'Good evening';
  return 'Good night';
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
