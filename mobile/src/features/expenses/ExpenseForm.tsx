import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '@/src/components/ui/AppText';
import { fonts } from '@/src/theme/typography';
import type { Expense, ExpenseCreateInput, Group, SplitType, User } from '@/src/types/api';
import { useThemeStore } from '@/src/stores/themeStore';
import { TextField } from '@/src/components/ui/TextField';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { CurrencyPicker } from '@/src/components/ui/CurrencyPicker';
import { SegmentedControl } from '@/src/components/ui/SegmentedControl';
import { Avatar } from '@/src/components/ui/Avatar';
import { CategoryField } from '@/src/components/expenses/CategoryField';
import { DateField } from '@/src/components/expenses/DateField';
import { todayISO } from '@/src/utils/format';
import { SPLIT_TYPE_OPTIONS } from './constants';
import {
  buildExpensePayload,
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
      <Card elevated="md" padded={false} style={styles.hero}>
        <LinearGradient
          colors={[t.brand50, t.cardBg]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroFill}
        >
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, value } }) => (
              <TextField
                testID="expense-description"
                grouped
                value={value}
                onChangeText={onChange}
                placeholder="What's this for?"
                autoFocus={!isEditing}
                error={errors.description?.message}
                style={styles.heroDescription}
              />
            )}
          />

          <View style={[styles.heroDivider, { backgroundColor: t.cardBorder }]} />

          <View style={styles.amountRow}>
            <AppText muted variant="overline" style={styles.amountLabel}>
              Amount
            </AppText>
            <View style={styles.amountInputRow}>
              <Controller
                control={control}
                name="amount"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    testID="expense-amount"
                    value={value}
                    onChangeText={onChange}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={t.textMuted}
                    style={[styles.amountInput, { color: t.text, fontFamily: fonts.extrabold }]}
                    accessibilityLabel="Amount"
                  />
                )}
              />
              <Controller
                control={control}
                name="currency"
                render={({ field: { onChange, value } }) => (
                  <CurrencyPicker
                    compact
                    value={value}
                    onChange={(code) => onChange(code)}
                    includeCodes={[group.currency, expense?.original_currency || '']}
                  />
                )}
              />
            </View>
            {errors.amount?.message ? (
              <AppText variant="caption" style={{ color: t.danger, marginTop: 4 }}>
                {errors.amount.message}
              </AppText>
            ) : errors.currency?.message ? (
              <AppText variant="caption" style={{ color: t.danger, marginTop: 4 }}>
                {errors.currency.message}
              </AppText>
            ) : null}
          </View>
        </LinearGradient>
      </Card>
      {duplicateWarning ? (
        <AppText style={[styles.warn, { color: t.brand700 }]}>{duplicateWarning}</AppText>
      ) : null}

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
                  styles.personChip,
                  {
                    backgroundColor: selected ? t.brand500 : t.cardBg,
                    borderColor: selected ? t.brand500 : t.cardBorder,
                  },
                ]}
              >
                <Avatar name={m.name} seed={m.id} size={22} avatarUrl={m.avatar_url} />
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
                  <View style={styles.memberRowLeft}>
                    <Avatar name={m.name} seed={m.id} size={28} avatarUrl={m.avatar_url} />
                    <AppText style={{ color: t.text, fontFamily: fonts.semibold }}>
                      {youLabel(m)}
                    </AppText>
                  </View>
                  <Ionicons
                    name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20}
                    color={selected ? t.brand500 : t.textMuted}
                  />
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
      <SegmentedControl
        options={SPLIT_TYPE_OPTIONS.map((st) => ({ key: st.value, label: st.label }))}
        value={splitType}
        onChange={setSplitType}
      />
      <AppText style={{ color: t.textMuted, fontSize: 12, marginTop: -6, marginBottom: 8 }}>
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
                <View style={styles.memberRowLeft}>
                  <Avatar name={m.name} seed={m.id} size={28} avatarUrl={m.avatar_url} />
                  <AppText style={{ color: t.text, fontFamily: fonts.semibold }}>
                    {youLabel(m)}
                  </AppText>
                </View>
                <Ionicons
                  name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={selected ? t.brand500 : t.textMuted}
                />
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
      <Controller
        control={control}
        name="category"
        render={({ field: { onChange, value } }) => (
          <CategoryField value={value || ''} onChange={onChange} />
        )}
      />

      <AppText style={[styles.section, { color: t.text }]}>Date</AppText>
      <Controller
        control={control}
        name="date"
        render={({ field: { onChange, value } }) => (
          <DateField value={value || todayISO()} onChange={onChange} />
        )}
      />
      {errors.date?.message ? (
        <AppText variant="caption" style={{ color: t.danger, marginTop: 4 }}>
          {errors.date.message}
        </AppText>
      ) : null}

      {formError ? (
        <AppText style={[styles.errorBox, { color: t.danger, backgroundColor: t.brand50 }]}>
          {formError}
        </AppText>
      ) : null}

      <Button
        title={isEditing ? 'Save changes' : 'Add expense'}
        testID="expense-submit"
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
  hero: { overflow: 'hidden' },
  heroFill: { padding: 16 },
  heroDescription: { fontSize: 17, fontFamily: fonts.bold },
  heroDivider: { height: StyleSheet.hairlineWidth, marginVertical: 14 },
  amountRow: {},
  amountLabel: { marginBottom: 6 },
  amountInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  amountInput: {
    flex: 1,
    fontSize: 40,
    letterSpacing: -1,
    paddingVertical: 2,
  },
  section: { fontSize: 15, fontFamily: fonts.extrabold, marginTop: 18, marginBottom: 8 },
  sectionHead: {
    marginTop: 18,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  personChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
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
  memberRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
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
