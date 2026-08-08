import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Expense, ExpenseCreateInput, Group, SplitType, User } from '@/src/types/api';
import { useThemeStore } from '@/src/stores/themeStore';
import { TextField } from '@/src/components/ui/TextField';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { todayISO } from '@/src/utils/format';
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CURRENCIES,
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
        <Text style={[styles.warn, { color: '#d97706' }]}>⚠ {duplicateWarning}</Text>
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
          <Text style={[styles.label, { color: t.textMuted }]}>Currency</Text>
          <View style={styles.chips}>
            {EXPENSE_CURRENCIES.map((c) => (
              <Pressable
                key={c}
                onPress={() => setValue('currency', c, { shouldValidate: true })}
                style={[
                  styles.chipSm,
                  {
                    backgroundColor: currency.toUpperCase() === c ? t.brand500 : t.cardBg,
                    borderColor: t.cardBorder,
                  },
                ]}
              >
                <Text
                  style={{
                    color: currency.toUpperCase() === c ? t.btnPrimaryText : t.text,
                    fontWeight: '700',
                    fontSize: 12,
                  }}
                >
                  {c}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {needsFx ? (
        <Card style={{ gap: 8, backgroundColor: t.brand50 }}>
          <Text style={{ color: t.text, fontWeight: '700', fontSize: 13 }}>
            Exchange rate: 1 {currency.toUpperCase()} = ? {group.currency}
          </Text>
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
          <Text style={{ color: t.textMuted, fontSize: 12 }}>
            Balances use the converted group-currency total (calculated by the server).
          </Text>
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
          {isNegative ? <Text style={{ color: t.btnPrimaryText, fontSize: 12 }}>✓</Text> : null}
        </View>
        <Text style={{ color: t.text, flex: 1, fontWeight: '600' }}>
          This is a refund / adjustment
        </Text>
      </Pressable>

      <View style={styles.sectionHead}>
        <Text style={[styles.section, { color: t.text }]}>Paid by</Text>
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
          <Text style={{ color: t.brand600, fontWeight: '700', fontSize: 13 }}>
            {multiplePayers ? 'Single payer' : 'Multiple payers'}
          </Text>
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
                <Text
                  style={{
                    color: selected ? t.btnPrimaryText : t.text,
                    fontWeight: '700',
                  }}
                >
                  {youLabel(m)}
                </Text>
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
                  <Text style={{ color: t.text, fontWeight: '600' }}>{youLabel(m)}</Text>
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

      <Text style={[styles.section, { color: t.text }]}>Split</Text>
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
              <Text
                style={{
                  color: selected ? t.btnPrimaryText : t.text,
                  fontWeight: '700',
                }}
              >
                {st.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={{ color: t.textMuted, fontSize: 12, marginBottom: 8 }}>
        {splitDetailsHint(splitType)}
      </Text>

      <View style={styles.sectionHead}>
        <Text style={[styles.section, { color: t.text, marginTop: 0 }]}>Split among</Text>
        <Pressable
          onPress={() =>
            setSplitAmongOverride(
              splitAmong.length === members.length ? [] : members.map((m) => m.id),
            )
          }
        >
          <Text style={{ color: t.brand600, fontWeight: '700', fontSize: 13 }}>
            {splitAmong.length === members.length ? 'Clear' : 'Select all'}
          </Text>
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
                <Text style={{ color: t.text, fontWeight: '600' }}>{youLabel(m)}</Text>
                <Text style={{ color: selected ? t.brand600 : t.textMuted, fontWeight: '700' }}>
                  {selected ? 'On' : 'Off'}
                </Text>
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

      <Text style={[styles.section, { color: t.text }]}>Category</Text>
      <View style={styles.chips}>
        <Pressable
          onPress={() => setValue('category', '')}
          style={[
            styles.chip,
            {
              backgroundColor: !category ? t.brand500 : t.cardBg,
              borderColor: t.cardBorder,
            },
          ]}
        >
          <Text
            style={{
              color: !category ? t.btnPrimaryText : t.text,
              fontWeight: '600',
            }}
          >
            None
          </Text>
        </Pressable>
        {EXPENSE_CATEGORIES.map((c) => {
          const selected = category === c;
          return (
            <Pressable
              key={c}
              onPress={() => setValue('category', c)}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? t.brand500 : t.cardBg,
                  borderColor: selected ? t.brand500 : t.cardBorder,
                },
              ]}
            >
              <Text
                style={{
                  color: selected ? t.btnPrimaryText : t.text,
                  fontWeight: '600',
                }}
              >
                {c}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.section, { color: t.text }]}>Date</Text>
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
            <Text
              style={{
                color: date === opt.value ? t.btnPrimaryText : t.text,
                fontWeight: '700',
                fontSize: 12,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {formError ? (
        <Text style={[styles.errorBox, { color: t.danger, backgroundColor: t.brand50 }]}>
          {formError}
        </Text>
      ) : null}

      <Button
        title={isEditing ? 'Save changes' : 'Add expense'}
        style={{ marginTop: 16 }}
        loading={submitting}
        onPress={handleSubmit(submit)}
      />
      <Text style={{ color: t.textMuted, fontSize: 11, marginTop: 8, lineHeight: 16 }}>
        Splits and balances are calculated on the server. Notes and receipt uploads are not
        supported by the API yet.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 15, fontWeight: '800', marginTop: 18, marginBottom: 8 },
  sectionHead: {
    marginTop: 18,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  chipSm: {
    borderWidth: 1,
    borderRadius: 999,
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
  warn: { fontSize: 12, fontWeight: '600', marginTop: 6 },
  errorBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    fontSize: 13,
    fontWeight: '600',
    overflow: 'hidden',
  },
});
