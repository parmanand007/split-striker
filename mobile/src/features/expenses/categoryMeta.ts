import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { EXPENSE_CATEGORIES } from './constants';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type CategoryMeta = {
  icon: IconName;
  /** Subtle tint for light surfaces */
  tint: string;
  /** Icon/fg color */
  fg: string;
};

/** Existing category strings only — do not rename. */
export const CATEGORY_META: Record<(typeof EXPENSE_CATEGORIES)[number], CategoryMeta> = {
  'Food & Drink': { icon: 'restaurant-outline', tint: '#fff7ed', fg: '#c2410c' },
  Accommodation: { icon: 'bed-outline', tint: '#ecfeff', fg: '#0e7490' },
  Transport: { icon: 'car-outline', tint: '#f0fdf4', fg: '#15803d' },
  Shopping: { icon: 'bag-handle-outline', tint: '#fff1f2', fg: '#be123c' },
  Entertainment: { icon: 'film-outline', tint: '#fdf4ff', fg: '#a21caf' },
  Utilities: { icon: 'flash-outline', tint: '#fffbeb', fg: '#b45309' },
  Other: { icon: 'cube-outline', tint: '#f8fafc', fg: '#64748b' },
};

const FALLBACK: CategoryMeta = {
  icon: 'pricetag-outline',
  tint: '#f8fafc',
  fg: '#64748b',
};

export function getCategoryMeta(category?: string | null): CategoryMeta {
  if (!category) return FALLBACK;
  return (CATEGORY_META as Record<string, CategoryMeta>)[category] ?? FALLBACK;
}
