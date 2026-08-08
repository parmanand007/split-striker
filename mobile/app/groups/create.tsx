import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { createGroup } from '@/src/api/groups';
import { getUsers } from '@/src/api/users';
import { useAuthStore } from '@/src/stores/authStore';
import { useThemeStore } from '@/src/stores/themeStore';
import { Screen } from '@/src/components/ui/Screen';
import { TextField } from '@/src/components/ui/TextField';
import { Button } from '@/src/components/ui/Button';
import { LoadingView } from '@/src/components/ui/StateViews';
import { GROUP_CURRENCIES } from '@/src/features/groups/constants';
import { ApiError } from '@/src/types/api';

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'Use a 3-letter currency code'),
  emoji: z.string().max(10).optional(),
});

type FormValues = z.infer<typeof schema>;

export default function CreateGroupScreen() {
  const user = useAuthStore((s) => s.user);
  const t = useThemeStore((s) => s.tokens);
  const router = useRouter();
  const qc = useQueryClient();
  const [memberIds, setMemberIds] = useState<number[]>([]);
  const [memberSearch, setMemberSearch] = useState('');

  const usersQuery = useQuery({ queryKey: ['users'], queryFn: getUsers });

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', currency: 'INR', emoji: '' },
  });

  const currency = useWatch({ control, name: 'currency' });

  const candidates = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    return (usersQuery.data ?? [])
      .filter((u) => u.id !== user?.id)
      .filter((u) => {
        if (!q) return true;
        return (
          u.name.toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q)
        );
      });
  }, [usersQuery.data, user?.id, memberSearch]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      createGroup({
        name: values.name.trim(),
        currency: values.currency.toUpperCase(),
        emoji: values.emoji?.trim() || null,
        created_by_id: user!.id,
        member_ids: Array.from(new Set([user!.id, ...memberIds])),
        simplify_debts: true,
      }),
    onSuccess: async (group) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['groups'] }),
        qc.invalidateQueries({ queryKey: ['summary'] }),
      ]);
      router.replace(`/groups/${group.id}`);
    },
    onError: (e) => {
      Alert.alert('Could not create group', e instanceof ApiError ? e.detail : String(e));
    },
  });

  const toggleMember = (id: number) => {
    setMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'New group',
          headerShown: true,
          presentation: 'modal',
          headerTintColor: t.brand500,
          headerStyle: { backgroundColor: t.pageBg },
          headerShadowVisible: false,
        }}
      />
      <Screen withHeader scroll keyboard>
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, value } }) => (
            <TextField
              testID="group-name"
              label="Group name"
              value={value}
              onChangeText={onChange}
              error={errors.name?.message}
              placeholder="Manali trip"
              autoFocus
            />
          )}
        />

        <Text style={[styles.section, { color: t.text }]}>Currency</Text>
        <View style={styles.chips}>
          {GROUP_CURRENCIES.map((code) => {
            const selected = currency?.toUpperCase() === code;
            return (
              <Pressable
                key={code}
                onPress={() => setValue('currency', code, { shouldValidate: true })}
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
                    fontSize: 13,
                  }}
                >
                  {code}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {errors.currency ? (
          <Text style={{ color: t.danger, marginTop: 6 }}>{errors.currency.message}</Text>
        ) : null}

        <View style={{ height: 12 }} />
        <Controller
          control={control}
          name="emoji"
          render={({ field: { onChange, value } }) => (
            <TextField
              label="Emoji (optional)"
              value={value || ''}
              onChangeText={onChange}
              placeholder="🏔️"
            />
          )}
        />

        <Text style={[styles.section, { color: t.text }]}>Members</Text>
        <Text style={{ color: t.textMuted, marginBottom: 8 }}>
          You are included automatically. Select others to add now (you can invite later too).
        </Text>
        <TextField
          label="Search people"
          value={memberSearch}
          onChangeText={setMemberSearch}
          placeholder="Name or email"
          autoCapitalize="none"
        />

        <View style={{ gap: 8, marginTop: 12, marginBottom: 20 }}>
          {usersQuery.isLoading ? (
            <LoadingView label="Loading people…" />
          ) : candidates.length === 0 ? (
            <Text style={{ color: t.textMuted }}>
              No matching users. You can still create the group and share an invite link.
            </Text>
          ) : (
            candidates.map((u) => {
              const selected = memberIds.includes(u.id);
              return (
                <Pressable
                  key={u.id}
                  onPress={() => toggleMember(u.id)}
                  style={[
                    styles.member,
                    {
                      borderColor: selected ? t.brand500 : t.cardBorder,
                      backgroundColor: selected ? t.brand50 : t.cardBg,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: t.text, fontWeight: '600' }}>{u.name}</Text>
                    <Text style={{ color: t.textMuted }}>{u.email}</Text>
                  </View>
                  <Text style={{ color: selected ? t.brand600 : t.textMuted, fontWeight: '700' }}>
                    {selected ? 'Added' : 'Add'}
                  </Text>
                </Pressable>
              );
            })
          )}
        </View>

        <Button
          testID="group-create-submit"
          title={
            memberIds.length
              ? `Create group · ${memberIds.length + 1} members`
              : 'Create group'
          }
          loading={mutation.isPending}
          onPress={handleSubmit((v) => mutation.mutate(v))}
        />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 16, fontWeight: '700', marginTop: 20, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  member: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
