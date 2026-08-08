import type { ExpenseCreateInput, SplitType } from '@/src/types/api';

export interface ExpenseFormValues {
  description: string;
  amount: string;
  currency: string;
  fxRate: string;
  date: string;
  category: string;
  isNegative: boolean;
}

export interface BuildExpensePayloadInput {
  values: ExpenseFormValues;
  /** Single-payer mode: one user pays the full amount. */
  payerId: number | null;
  /** Multi-payer mode: map of userId → amount paid (unsigned). */
  multiplePayers: boolean;
  paidByAmounts: Record<string, string>;
  splitType: SplitType;
  splitAmong: number[];
  splitDetails: Record<string, string>;
  actorUserId: number;
  groupCurrency: string;
}

/**
 * Client-side input checks only. Does NOT compute final split shares —
 * the backend split_calculator is the source of truth.
 */
export function buildExpensePayload(input: BuildExpensePayloadInput): ExpenseCreateInput {
  const {
    values,
    payerId,
    multiplePayers,
    paidByAmounts,
    splitType,
    splitAmong,
    splitDetails,
    actorUserId,
  } = input;

  const desc = values.description.trim();
  if (!desc) throw new Error('Description is required.');

  const parsedAmt = Number(values.amount);
  if (!Number.isFinite(parsedAmt) || parsedAmt === 0) {
    throw new Error('Enter a valid non-zero amount.');
  }

  if (!splitAmong.length) throw new Error('Select at least one person to split with.');

  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.date)) {
    throw new Error('Date must be YYYY-MM-DD.');
  }

  const currency = values.currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error('Currency must be a 3-letter code.');
  }

  const fx = Number(values.fxRate || '1');
  if (!Number.isFinite(fx) || fx <= 0) {
    throw new Error('FX rate must be a positive number.');
  }

  const absAmt = Math.abs(parsedAmt);
  const signedAmount = values.isNegative ? -absAmt : absAmt;

  let paidBy: Record<string, number>;
  if (!multiplePayers) {
    if (!payerId) throw new Error('Select who paid.');
    paidBy = { [String(payerId)]: signedAmount };
  } else {
    paidBy = {};
    let sum = 0;
    for (const [uid, raw] of Object.entries(paidByAmounts)) {
      const val = Number(raw);
      if (!Number.isFinite(val) || val <= 0) {
        throw new Error('Enter a valid paid amount for each selected payer.');
      }
      paidBy[uid] = values.isNegative ? -val : val;
      sum += val;
    }
    if (Object.keys(paidBy).length === 0) {
      throw new Error('Select at least one payer.');
    }
    if (Math.abs(sum - absAmt) > 0.05) {
      throw new Error(
        `Paid amounts sum to ${sum.toFixed(2)}, but total is ${absAmt.toFixed(2)}.`,
      );
    }
  }

  let details: Record<string, string> | null = null;
  if (splitType !== 'equal') {
    details = {};
    let detailSum = 0;
    for (const id of splitAmong) {
      const raw = splitDetails[String(id)];
      const val = Number(raw);
      if (!Number.isFinite(val) || val < 0) {
        throw new Error('Enter a valid split value for each selected person.');
      }
      if (splitType !== 'shares' && val === 0) {
        throw new Error('Split values must be greater than zero.');
      }
      details[String(id)] = String(val);
      detailSum += val;
    }

    if (splitType === 'percentage' && Math.abs(detailSum - 100) > 0.05) {
      throw new Error(`Percentages must add up to 100% (currently ${detailSum.toFixed(1)}%).`);
    }

    if (splitType === 'exact' && Math.abs(detailSum - absAmt) > 0.05) {
      throw new Error(
        `Exact amounts must add up to ${absAmt.toFixed(2)} (currently ${detailSum.toFixed(2)}).`,
      );
    }

    if (splitType === 'shares' && detailSum <= 0) {
      throw new Error('Total shares must be greater than zero.');
    }
  }

  return {
    description: desc,
    original_amount: signedAmount,
    original_currency: currency,
    fx_rate: fx,
    paid_by: paidBy,
    split_type: splitType,
    split_among: splitAmong,
    split_details: details,
    category: values.category?.trim() || null,
    date: values.date,
    is_negative: values.isNegative,
    actor_user_id: actorUserId,
  };
}

export function splitDetailsHint(splitType: SplitType): string {
  switch (splitType) {
    case 'exact':
      return 'Enter each person’s share. Values must sum to the expense amount.';
    case 'percentage':
      return 'Enter each person’s %. Values must sum to 100.';
    case 'shares':
      return 'Enter relative shares (e.g. 1, 2, 1). Backend converts to amounts.';
    default:
      return 'Split equally among selected people. Final rounding is done by the server.';
  }
}

export function shiftISODate(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
