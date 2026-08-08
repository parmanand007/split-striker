export const GROUP_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'KRW', 'SGD', 'AED'] as const;

export const GROUP_ICON_COLORS = [
  '#be1240',
  '#0ea5e9',
  '#b45309',
  '#be123c',
  '#0f766e',
  '#ea580c',
  '#9f1239',
  '#0369a1',
];

export function groupColor(id: number): string {
  return GROUP_ICON_COLORS[id % GROUP_ICON_COLORS.length];
}
