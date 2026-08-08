import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, StyleSheet, View } from 'react-native';
import { AppText } from '@/src/components/ui/AppText';
import { fonts } from '@/src/theme/typography';
import { createGroup } from '@/src/api/groups';
import { useAuthStore } from '@/src/stores/authStore';
import { useThemeStore } from '@/src/stores/themeStore';
import { Screen } from '@/src/components/ui/Screen';
import { TextField } from '@/src/components/ui/TextField';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { CurrencyPicker } from '@/src/components/ui/CurrencyPicker';
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

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', currency: 'INR', emoji: '' },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      createGroup({
        name: values.name.trim(),
        currency: values.currency.toUpperCase(),
        emoji: values.emoji?.trim() || null,
        created_by_id: user!.id,
        member_ids: [user!.id],
        simplify_debts: true,
      }),
    onSuccess: async (group) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['groups'] }),
        qc.invalidateQueries({ queryKey: ['summary'] }),
      ]);
      Alert.alert(
        'Group created',
        'Invite friends to join — members can only be added through an invite link.',
        [
          {
            text: 'Invite members',
            onPress: () => router.replace(`/groups/${group.id}/members`),
          },
        ],
      );
    },
    onError: (e) => {
      Alert.alert('Could not create group', e instanceof ApiError ? e.detail : String(e));
    },
  });

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

        <Controller
          control={control}
          name="currency"
          render={({ field: { onChange, value } }) => (
            <CurrencyPicker
              label="Currency"
              value={value}
              onChange={(code) => onChange(code)}
              error={errors.currency?.message}
            />
          )}
        />

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

        <Card elevated="sm" style={{ marginTop: 20, gap: 8 }}>
          <AppText style={[styles.section, { color: t.text, marginTop: 0 }]}>Members</AppText>
          <AppText style={{ color: t.textMuted, lineHeight: 20 }}>
            You&apos;ll be added automatically. To add anyone else, share an invite link after the
            group is created — direct adds are not allowed.
          </AppText>
        </Card>

        <Button
          testID="group-create-submit"
          fullWidth={false}
          title="Create group"
          loading={mutation.isPending}
          onPress={handleSubmit((v) => mutation.mutate(v))}
          style={{ marginTop: 20, marginBottom: 8 }}
        />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 16, fontFamily: fonts.bold, marginBottom: 8 },
});
