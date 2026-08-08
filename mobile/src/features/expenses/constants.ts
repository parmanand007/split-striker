import type { SplitType } from '@/src/types/api';

export const EXPENSE_CATEGORIES = [
  'Food & Drink',
  'Accommodation',
  'Transport',
  'Shopping',
  'Entertainment',
  'Utilities',
  'Other',
] as const;

export const SPLIT_TYPE_OPTIONS: { value: SplitType; label: string }[] = [
  { value: 'equal', label: 'Equal' },
  { value: 'exact', label: 'Exact' },
  { value: 'percentage', label: '%' },
  { value: 'shares', label: 'Shares' },
];

export const EXPENSE_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'SGD', 'AED'] as const;
