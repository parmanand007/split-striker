/** Shared currency catalog for pickers. Codes remain the stored values. */
export type CurrencyOption = {
  code: string;
  name: string;
  flag: string;
};

export const CURRENCIES: CurrencyOption[] = [
  { code: 'INR', name: 'Indian Rupee', flag: '🇮🇳' },
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧' },
  { code: 'AED', name: 'UAE Dirham', flag: '🇦🇪' },
  { code: 'SGD', name: 'Singapore Dollar', flag: '🇸🇬' },
  { code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'JPY', name: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'KRW', name: 'South Korean Won', flag: '🇰🇷' },
  { code: 'CHF', name: 'Swiss Franc', flag: '🇨🇭' },
  { code: 'NZD', name: 'New Zealand Dollar', flag: '🇳🇿' },
  { code: 'HKD', name: 'Hong Kong Dollar', flag: '🇭🇰' },
  { code: 'CNY', name: 'Chinese Yuan', flag: '🇨🇳' },
  { code: 'THB', name: 'Thai Baht', flag: '🇹🇭' },
  { code: 'MYR', name: 'Malaysian Ringgit', flag: '🇲🇾' },
];

export function findCurrency(code?: string | null): CurrencyOption | undefined {
  if (!code) return undefined;
  const upper = code.toUpperCase();
  return CURRENCIES.find((c) => c.code === upper);
}

export function formatCurrencyLabel(code: string): string {
  const hit = findCurrency(code);
  if (!hit) return code.toUpperCase();
  return `${hit.flag} ${hit.code} — ${hit.name}`;
}
