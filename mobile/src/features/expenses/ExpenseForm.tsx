import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/src/components/ui/AppText';
import { fonts } from '@/src/theme/typography';
import type { Expense, ExpenseCreateInput, Group, SplitType, User } from '@/src/types/api';
import { useThemeStore } from '@/src/stores/themeStore';
import { TextField } from '@/src/components/ui/TextField';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { CurrencyPicker } from '@/src/components/ui/CurrencyPicker';
import { CategoryIcon } from '@/src/components/expenses/CategoryIcon';
import { todayISO } from '@/src/utils/format';
import {
  EXPENSE_CATEGORIES,
  SPLIT_TYPE_OPTIONS,
} from './constants';
import {
  buildExpensePayload,
  shiftISODate,
  splitDetailsHint,
  type ExpenseFormValues,
} from './validation';

const schema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((v) => Number.isFinite(Number(v)) && Number(v) !== 0, 'Enter a valid amount'),
  currency: z
    .string()
    .trim()
    .refine((v) => /^[A-Za-z]{3}$/.test(v), 'Use a 3-letter currency code'),
  fxRate: z
    .string()
    .min(1)
    .refine((v) => Number.isFinite(Number(v)) && Number(v) > 0, 'FX rate must be positive'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  category: z.string().optional(),
  isNegative: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  group: Group;
  currentUser: User;
  expense?: Expense | null;
  submitting?: boolean;
  duplicateWarning?: string | null;
  onDescriptionAmountChange?: (description: string, amount: string, payerId: number | null) => void;
  onSubmit: (payload: ExpenseCreateInput) => void;
}

function initialSplitAmong(expense: Expense | undefined | null, members: User[]): number[] {
  if (expense?.split_amounts) return Object.keys(expense.split_amounts).map(Number);
  return members.map((m) => m.id);
}

function initialSplitDetails(expense: Expense | undefined | null): Record<string, string> {
  if (expense?.split_raw) {
    return Object.fromEntries(Object.entries(expense.split_raw).map(([k, v]) => [k, String(v)]));
  }
  return {};
}

function initialPaidBy(expense: Expense | undefined | null, userId: number) {
  if (expense?.paid_by) {
    const entries = Object.entries(expense.paid_by);
    return {
      multiple: entries.length > 1,
      payerId: Number(entries[0]?.[0]) || userId,
      amounts: Object.fromEntries(entries.map(([k, v]) => [k, String(Math.abs(Number(v)))])),
    };
  }
  return { multiple: false, payerId: userId, amounts: { [String(userId)]: '' } };
}

export function ExpenseForm({
  group,
  currentUser,
  expense,
  submitting,
  duplicateWarning,
  onDescriptionAmountChange,
  onSubmit,
}: Props) {
  const t = useThemeStore((s) => s.tokens);
  const members = group.members;
  const isEditing = !!expense;

  const paidInit = useMemo(
    () => initialPaidBy(expense, currentUser.id),
    [expense, currentUser.id],
  );

  const [payerId, setPayerId] = useState(paidInit.payerId);
  const [multiplePayers, setMultiplePayers] = useState(paidInit.multiple);
  const [paidByAmounts, setPaidByAmounts] = useState<Record<string, string>>(paidInit.amounts);
  const [splitType, setSplitType] = useState<SplitType>(expense?.split_type || 'equal');
  // null = “not customized yet” → default to all members once group loads.
  const [splitAmongOverride, setSplitAmongOverride] = useState<number[] | null>(() =>
    expense ? initialSplitAmong(expense, members) : null,
  );
  const splitAmong = splitAmongOverride ?? members.map((m) => m.id);
  const [splitDetails, setSplitDetails] = useState<Record<string, string>>(() =>
    initialSplitDetails(expense),
  );
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: expense?.description || '',
      amount: expense ? String(Math.abs(Number(expense.original_amount))) : '',
      currency: expense?.original_currency || group.currency,
      fxRate: expense?.fx_rate || '1',
      date: expense?.date || todayISO(),
      category: expense?.category || '',
      isNegative: expense?.is_negative || false,
    },
  });

  const description = useWatch({ control, name: 'description' });
  const amount = useWatch({ control, name: 'amount' });
  const currency = useWatch({ control, name: 'currency' }) || 'INR';
  const isNegative = !!useWatch({ control, name: 'isNegative' });
  const date = useWatch({ control, name: 'date' }) || todayISO();
  const category = useWatch({ control, name: 'category' }) || '';

  useEffect(() => {
    onDescriptionAmountChange?.(description, amount, multiplePayers ? null : payerId);
  }, [description, amount, payerId, multiplePayers, onDescriptionAmountChange]);

  const needsFx = currency.toUpperCase() !== group.currency.toUpperCase();

  const toggleSplitMember = (id: number) => {
    setSplitAmongOverride((prev) => {
      const base = prev ?? members.map((m) => m.id);
      return base.includes(id) ? base.filter((x) => x !== id) : [...base, id];
    });
  };

  const togglePayer = (id: number) => {
    const sid = String(id);
    setPaidByAmounts((prev) => {
      const next = { ...prev };
      if (next[sid] !== undefined) delete next[sid];
      else next[sid] = '';
      return next;
    });
  };

  const submit = (values: FormValues) => {
    setFormError(null);
    try {
      const payload = buildExpensePayload({
        values: values as ExpenseFormValues,
        payerId,
        multiplePayers,
        paidByAmounts,
        splitType,
        splitAmong,
        splitDetails,
        actorUserId: currentUser.id,
        groupCurrency: group.currency,
      });
      onSubmit(payload);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    }
  };

  const youLabel = (m: User) => (m.id === currentUser.id ? `${m.name} (you)` : m.name);

  return (
    <View style={{ gap: 4, paddingBottom: 28 }}>
      <Controller
        control={control}
        name="description"
        render={({ field: { onChange, value } }) => (
          <TextField
            label="Description"
            value={value}
            onChangeText={onChange}
            placeholder="e.g. Dinner at Rustom's"
            autoFocus={!isEditing}
            error={errors.description?.message}
          />
        )}
      />
      {duplicateWarning ? (
        <AppText style={[styles.warn, { color: t.brand700 }]}>{duplicateWarning}</AppText>
      ) : null}

      <View style={styles.row2}>
        <View style={{ flex: 2 }}>
          <Controller
            control={control}
            name="amount"
            render={({ field: { onChange, value } }) => (
              <TextField
                label="Amount"
                keyboardType="decimal-pad"
                value={value}
                onChangeText={onChange}
                placeholder="0.00"
                error={errors.amount?.message}
              />
            )}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Controller
            control={control}
            name="currency"
            render={({ field: { onChange, value } }) => (
              <CurrencyPicker
                label="Currency"
                value={value}
                onChange={(code) => onChange(code)}
                error={errors.currency?.message}
                includeCodes={[group.currency, expense?.original_currency || '']}
              />
            )}
          />
        </View>
      </View>

      {needsFx ? (
        <Card style={{ gap: 8, backgroundColor: t.brand50 }}>
          <AppText style={{ color: t.text, fontFamily: fonts.bold, fontSize: 13 }}>
            Exchange rate: 1 {currency.toUpperCase()} = ? {group.currency}
          </AppText>
          <Controller
            control={control}
            name="fxRate"
            render={({ field: { onChange, value } }) => (
              <TextField
                keyboardType="decimal-pad"
                value={value}
                onChangeText={onChange}
                placeholder="e.g. 83"
                error={errors.fxRate?.message}
              />
            )}
          />
          <AppText style={{ color: t.textMuted, fontSize: 12 }}>
            Balances use the converted group-currency total (calculated by the server).
          </AppText>
        </Card>
      ) : null}

      <Pressable
        onPress={() => setValue('isNegative', !isNegative)}
        style={[styles.toggleRow, { borderColor: t.cardBorder, backgroundColor: t.cardBg }]}
      >
        <View
          style={[
            styles.checkbox,
            {
              borderColor: isNegative ? t.brand500 : t.cardBorder,
              backgroundColor: isNegative ? t.brand500 : 'transparent',
            },
          ]}
        >
          {isNegative ? <AppText style={{ color: t.btnPrimaryText, fontSize: 12 }}>✓</AppText> : null}
        </View>
        <AppText style={{ color: t.text, flex: 1, fontFamily: fonts.semibold }}>
          This is a refund / adjustment
        </AppText>
      </Pressable>

      <View style={styles.sectionHead}>
        <AppText style={[styles.section, { color: t.text }]}>Paid by</AppText>
        <Pressable
          onPress={() => {
            setMultiplePayers((v) => {
              const next = !v;
              if (next) {
                setPaidByAmounts((prev) =>
                  Object.keys(prev).length
                    ? prev
                    : { [String(payerId)]: amount || '' },
                );
              } else {
                const first = Number(Object.keys(paidByAmounts)[0]);
                if (Number.isFinite(first)) setPayerId(first);
              }
              return next;
            });
          }}
        >
          <AppText style={{ color: t.brand600, fontFamily: fonts.bold, fontSize: 13 }}>
            {multiplePayers ? 'Single payer' : 'Multiple payers'}
          </AppText>
        </Pressable>
      </View>

      {!multiplePayers ? (
        <View style={styles.chips}>
          {members.map((m) => {
            const selected = payerId === m.id;
            return (
              <Pressable
                key={m.id}
                onPress={() => setPayerId(m.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected ? t.brand500 : t.cardBg,
                    borderColor: selected ? t.brand500 : t.cardBorder,
                  },
                ]}
              >
                <AppText
                  style={{
                    color: selected ? t.btnPrimaryText : t.text,
                    fontFamily: fonts.bold,
                  }}
                >
                  {youLabel(m)}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {members.map((m) => {
            const sid = String(m.id);
            const selected = paidByAmounts[sid] !== undefined;
            return (
              <View key={m.id} style={{ gap: 6 }}>
                <Pressable
                  onPress={() => togglePayer(m.id)}
                  style={[
                    styles.memberRow,
                    {
                      borderColor: selected ? t.brand500 : t.cardBorder,
                      backgroundColor: selected ? t.brand50 : t.cardBg,
                    },
                  ]}
                >
                  <AppText style={{ color: t.text, fontFamily: fonts.semibold }}>{youLabel(m)}</AppText>
                </Pressable>
                {selected ? (
                  <TextField
                    label="Amount paid"
                    keyboardType="decimal-pad"
                    value={paidByAmounts[sid] || ''}
                    onChangeText={(v) =>
                      setPaidByAmounts((prev) => ({ ...prev, [sid]: v }))
                    }
                    placeholder="0.00"
                  />
                ) : null}
              </View>
            );
          })}
        </View>
      )}

      <AppText style={[styles.section, { color: t.text }]}>Split</AppText>
      <View style={styles.chips}>
        {SPLIT_TYPE_OPTIONS.map((st) => {
          const selected = splitType === st.value;
          return (
            <Pressable
              key={st.value}
              onPress={() => setSplitType(st.value)}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? t.brand500 : t.cardBg,
                  borderColor: selected ? t.brand500 : t.cardBorder,
                },
              ]}
            >
              <AppText
                style={{
                  color: selected ? t.btnPrimaryText : t.text,
                  fontFamily: fonts.bold,
                }}
              >
                {st.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      <AppText style={{ color: t.textMuted, fontSize: 12, marginBottom: 8 }}>
        {splitDetailsHint(splitType)}
      </AppText>

      <View style={styles.sectionHead}>
        <AppText style={[styles.section, { color: t.text, marginTop: 0 }]}>Split among</AppText>
        <Pressable
          onPress={() =>
            setSplitAmongOverride(
              splitAmong.length === members.length ? [] : members.map((m) => m.id),
            )
          }
        >
          <AppText style={{ color: t.brand600, fontFamily: fonts.bold, fontSize: 13 }}>
            {splitAmong.length === members.length ? 'Clear' : 'Select all'}
          </AppText>
        </Pressable>
      </View>

      <View style={{ gap: 8 }}>
        {members.map((m) => {
          const selected = splitAmong.includes(m.id);
          return (
            <View key={m.id} style={{ gap: 6 }}>
              <Pressable
                onPress={() => toggleSplitMember(m.id)}
                style={[
                  styles.memberRow,
                  {
                    borderColor: selected ? t.brand500 : t.cardBorder,
                    backgroundColor: selected ? t.brand50 : t.cardBg,
                  },
                ]}
              >
                <AppText style={{ color: t.text, fontFamily: fonts.semibold }}>{youLabel(m)}</AppText>
                <AppText style={{ color: selected ? t.brand600 : t.textMuted, fontFamily: fonts.bold }}>
                  {selected ? 'On' : 'Off'}
                </AppText>
              </Pressable>
              {selected && splitType !== 'equal' ? (
                <TextField
                  label={
                    splitType === 'percentage'
                      ? 'Percentage'
                      : splitType === 'shares'
                        ? 'Shares'
                        : 'Exact amount'
                  }
                  keyboardType="decimal-pad"
                  value={splitDetails[String(m.id)] || ''}
                  onChangeText={(v) =>
                    setSplitDetails((prev) => ({ ...prev, [String(m.id)]: v }))
                  }
                  placeholder={
                    splitType === 'percentage' ? '%' : splitType === 'shares' ? '1' : '0.00'
                  }
                />
              ) : null}
            </View>
          );
        })}
      </View>

      <AppText style={[styles.section, { color: t.text }]}>Category</AppText>
      <View style={styles.chips}>
        <Pressable
          onPress={() => setValue('category', '')}
          style={[
            styles.chip,
            styles.catChip,
            {
              backgroundColor: !category ? t.brand50 : t.cardBg,
              borderColor: !category ? t.brand500 : t.cardBorder,
            },
          ]}
        >
          <CategoryIcon category={null} size={28} />
          <AppText
            style={{
              color: !category ? t.brand700 : t.text,
              fontFamily: fonts.semibold,
              fontSize: 13,
            }}
          >
            None
          </AppText>
        </Pressable>
        {EXPENSE_CATEGORIES.map((c) => {
          const selected = category === c;
          return (
            <Pressable
              key={c}
              onPress={() => setValue('category', c)}
              style={[
                styles.chip,
                styles.catChip,
                {
                  backgroundColor: selected ? t.brand50 : t.cardBg,
                  borderColor: selected ? t.brand500 : t.cardBorder,
                },
              ]}
            >
              <CategoryIcon category={c} size={28} />
              <AppText
                style={{
                  color: selected ? t.brand700 : t.text,
                  fontFamily: fonts.semibold,
                  fontSize: 13,
                }}
              >
                {c}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <AppText style={[styles.section, { color: t.text }]}>Date</AppText>
      <Controller
        control={control}
        name="date"
        render={({ field: { onChange, value } }) => (
          <TextField
            label="YYYY-MM-DD"
            value={value}
            onChangeText={onChange}
            error={errors.date?.message}
            autoCapitalize="none"
          />
        )}
      />
      <View style={[styles.chips, { marginTop: 8 }]}>
        {[
          { label: 'Today', value: todayISO() },
          { label: 'Yesterday', value: shiftISODate(todayISO(), -1) },
        ].map((opt) => (
          <Pressable
            key={opt.label}
            onPress={() => setValue('date', opt.value, { shouldValidate: true })}
            style={[
              styles.chipSm,
              {
                backgroundColor: date === opt.value ? t.brand500 : t.cardBg,
                borderColor: t.cardBorder,
              },
            ]}
          >
            <AppText
              style={{
                color: date === opt.value ? t.btnPrimaryText : t.text,
                fontFamily: fonts.bold,
                fontSize: 12,
              }}
            >
              {opt.label}
            </AppText>
          </Pressable>
        ))}
      </View>

      {formError ? (
        <AppText style={[styles.errorBox, { color: t.danger, backgroundColor: t.brand50 }]}>
          {formError}
        </AppText>
      ) : null}

      <Button
        title={isEditing ? 'Save changes' : 'Add expense'}
        fullWidth={false}
        style={{ marginTop: 16 }}
        loading={submitting}
        onPress={handleSubmit(submit)}
      />
      <AppText style={{ color: t.textMuted, fontSize: 11, marginTop: 8, lineHeight: 16 }}>
        Splits and balances are calculated on the server. Notes and receipt uploads are not
        supported by the API yet.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 15, fontFamily: fonts.extrabold, marginTop: 18, marginBottom: 8 },
  sectionHead: {
    marginTop: 18,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: { fontSize: 12, fontFamily: fonts.bold, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  chipSm: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  memberRow: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  row2: { flexDirection: 'row', gap: 10, marginTop: 12, alignItems: 'flex-start' },
  toggleRow: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warn: { fontSize: 12, fontFamily: fonts.semibold, marginTop: 6 },
  errorBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    fontSize: 13,
    fontFamily: fonts.semibold,
    overflow: 'hidden',
  },
});
