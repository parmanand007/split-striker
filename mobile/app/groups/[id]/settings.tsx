import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, StyleSheet, Switch, View } from 'react-native';
import { AppText } from '@/src/components/ui/AppText';
import { fonts } from '@/src/theme/typography';
import {
  createInvite,
  deleteGroup,
  getEditRequests,
  getGroup,
  removeMember,
  reviewEditRequest,
  updateGroup,
} from '@/src/api/groups';
import { useAuthStore } from '@/src/stores/authStore';
import { useThemeStore } from '@/src/stores/themeStore';
import { Screen } from '@/src/components/ui/Screen';
import { Card } from '@/src/components/ui/Card';
import { TextField } from '@/src/components/ui/TextField';
import { Button } from '@/src/components/ui/Button';
import { ErrorView } from '@/src/components/ui/StateViews';
import { ListSkeleton } from '@/src/components/ui/ListSkeleton';
import { EXPENSE_CATEGORIES } from '@/src/features/expenses/constants';
import { ApiError } from '@/src/types/api';

const settingsSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  emoji: z.string().max(10).optional(),
  budget: z
    .string()
    .optional()
    .refine(
      (v) => !v || v.trim() === '' || (Number.isFinite(Number(v)) && Number(v) >= 0),
      'Enter a valid non-negative budget',
    ),
});

type SettingsForm = z.infer<typeof settingsSchema>;

export default function GroupSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Number(id);
  const user = useAuthStore((s) => s.user);
  const t = useThemeStore((s) => s.tokens);
  const router = useRouter();
  const qc = useQueryClient();

  const groupQuery = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => getGroup(groupId),
    enabled: Number.isFinite(groupId),
  });

  const isOwner = groupQuery.data?.created_by_id === user?.id;

  const editRequestsQuery = useQuery({
    queryKey: ['edit-requests', groupId],
    queryFn: () => getEditRequests(groupId, 'pending'),
    enabled: Number.isFinite(groupId) && !!isOwner,
  });

  const [archivedOverride, setArchivedOverride] = useState<boolean | null>(null);
  const [simplifyOverride, setSimplifyOverride] = useState<boolean | null>(null);
  const [confirmDelete, setConfirmDelete] = useState('');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  /** null = use server values; object = local draft while editing */
  const [categoryBudgetDraft, setCategoryBudgetDraft] = useState<Record<string, string> | null>(
    null,
  );

  const archived = archivedOverride ?? groupQuery.data?.archived ?? false;
  const simplify = simplifyOverride ?? groupQuery.data?.simplify_debts ?? true;
  const categoryBudgets = categoryBudgetDraft ?? groupQuery.data?.category_budgets ?? {};

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { name: '', emoji: '', budget: '' },
    values: groupQuery.data
      ? {
          name: groupQuery.data.name,
          emoji: groupQuery.data.emoji || '',
          budget: groupQuery.data.budget != null ? String(groupQuery.data.budget) : '',
        }
      : undefined,
  });

  const pendingRequests = useMemo(
    () => (editRequestsQuery.data ?? []).filter((r) => r.status === 'pending'),
    [editRequestsQuery.data],
  );

  const invalidate = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['group', groupId] }),
      qc.invalidateQueries({ queryKey: ['groups'] }),
      qc.invalidateQueries({ queryKey: ['summary'] }),
      qc.invalidateQueries({ queryKey: ['settlement', groupId] }),
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: (values: SettingsForm) => {
      const budgetTrim = values.budget?.trim() ?? '';
      const cleanedCats: Record<string, string> = {};
      for (const [k, v] of Object.entries(categoryBudgets)) {
        const t = v.trim();
        if (!t) continue;
        if (!Number.isFinite(Number(t)) || Number(t) < 0) {
          throw new Error(`Invalid category budget for ${k}`);
        }
        cleanedCats[k] = t;
      }
      return updateGroup(groupId, {
        name: values.name.trim(),
        emoji: values.emoji?.trim() || null,
        archived,
        simplify_debts: simplify,
        ...(budgetTrim
          ? { budget: budgetTrim, clear_budget: false }
          : { clear_budget: true }),
        ...(Object.keys(cleanedCats).length
          ? { category_budgets: cleanedCats, clear_category_budgets: false }
          : { clear_category_budgets: true }),
      });
    },
    onSuccess: async () => {
      setCategoryBudgetDraft(null);
      await invalidate();
      Alert.alert('Saved', 'Group settings updated.');
    },
    onError: (e) =>
      Alert.alert(
        'Save failed',
        e instanceof ApiError ? e.detail : e instanceof Error ? e.message : String(e),
      ),
  });

  const inviteMutation = useMutation({
    mutationFn: () => createInvite(groupId, user!.id),
    onSuccess: async (data) => {
      const link = Linking.createURL(`/invite/${data.token}`);
      setInviteLink(link);
      await Clipboard.setStringAsync(link);
      Alert.alert('Invite link copied', link);
    },
    onError: (e) => Alert.alert('Invite failed', e instanceof ApiError ? e.detail : String(e)),
  });

  const reviewMutation = useMutation({
    mutationFn: (payload: { id: number; status: 'approved' | 'rejected' }) =>
      reviewEditRequest(payload.id, { status: payload.status, actor_user_id: user!.id }),
    onSuccess: async () => {
      await editRequestsQuery.refetch();
      await qc.invalidateQueries({ queryKey: ['expenses', groupId] });
    },
    onError: (e) => Alert.alert('Review failed', e instanceof ApiError ? e.detail : String(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteGroup(groupId, user!.id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['groups'] });
      await qc.invalidateQueries({ queryKey: ['summary'] });
      router.replace('/(tabs)/groups');
    },
    onError: (e) => Alert.alert('Delete failed', e instanceof ApiError ? e.detail : String(e)),
  });

  const leaveMutation = useMutation({
    mutationFn: () => removeMember(groupId, user!.id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['groups'] });
      await qc.invalidateQueries({ queryKey: ['summary'] });
      router.replace('/(tabs)/groups');
    },
    onError: (e) =>
      Alert.alert(
        'Could not leave group',
        e instanceof ApiError
          ? e.detail
          : 'Settle your balance before leaving.',
      ),
  });

  if (groupQuery.isLoading) {
    return (
      <Screen withHeader>
        <ListSkeleton rows={4} />
      </Screen>
    );
  }
  if (groupQuery.isError || !groupQuery.data) {
    return (
      <ErrorView
        message={
          groupQuery.error instanceof ApiError
            ? groupQuery.error.detail
            : 'Group not found'
        }
        onRetry={() => void groupQuery.refetch()}
      />
    );
  }

  const group = groupQuery.data;
  const switchesDirty =
    archived !== group.archived || simplify !== group.simplify_debts;

  return (
    <>
      <Stack.Screen options={{ title: 'Settings' }} />
      <Screen withHeader scroll keyboard>
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, value } }) => (
            <TextField
              label="Name"
              value={value}
              onChangeText={onChange}
              error={errors.name?.message}
              editable={!!isOwner}
            />
          )}
        />
        <View style={{ height: 12 }} />
        <Controller
          control={control}
          name="emoji"
          render={({ field: { onChange, value } }) => (
            <TextField
              label="Emoji"
              value={value || ''}
              onChangeText={onChange}
              editable={!!isOwner}
            />
          )}
        />

        <View style={{ height: 12 }} />
        <Controller
          control={control}
          name="budget"
          render={({ field: { onChange, value } }) => (
            <TextField
              label={`Trip budget (${groupQuery.data?.currency || 'INR'}) — optional`}
              value={value || ''}
              onChangeText={onChange}
              keyboardType="decimal-pad"
              placeholder="e.g. 50000"
              error={errors.budget?.message}
              editable={!!isOwner}
            />
          )}
        />
        <AppText muted variant="caption" style={{ marginTop: 6 }}>
          Leave blank to clear the budget. Spent totals use existing group expenses.
        </AppText>

        {isOwner ? (
          <Card elevated="sm" style={{ marginTop: 16, gap: 10 }}>
            <AppText style={{ fontFamily: fonts.bold }}>Optional category budgets</AppText>
            <AppText muted variant="caption">
              Track planned spend per category. Leave blank to skip.
            </AppText>
            {EXPENSE_CATEGORIES.map((cat) => (
              <TextField
                key={cat}
                label={cat}
                value={categoryBudgets[cat] || ''}
                onChangeText={(text) =>
                  setCategoryBudgetDraft((prev) => ({
                    ...(prev ?? groupQuery.data?.category_budgets ?? {}),
                    [cat]: text,
                  }))
                }
                keyboardType="decimal-pad"
                placeholder="Optional"
              />
            ))}
          </Card>
        ) : null}

        <Card elevated="sm" style={{ marginTop: 16, gap: 14 }}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <AppText style={{ color: t.text, fontFamily: fonts.semibold }}>Archived</AppText>
              <AppText style={{ color: t.textMuted, fontSize: 12 }}>
                Blocks new expenses and members
              </AppText>
            </View>
            <Switch
              value={archived}
              disabled={!isOwner}
              onValueChange={setArchivedOverride}
              trackColor={{ true: t.brand400 }}
            />
          </View>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <AppText style={{ color: t.text, fontFamily: fonts.semibold }}>Simplify debts</AppText>
              <AppText style={{ color: t.textMuted, fontSize: 12 }}>
                Fewer suggested settlement transfers
              </AppText>
            </View>
            <Switch
              value={simplify}
              disabled={!isOwner}
              onValueChange={setSimplifyOverride}
              trackColor={{ true: t.brand400 }}
            />
          </View>
        </Card>

        {isOwner ? (
          <Button
            title="Save changes"
            style={{ marginTop: 16 }}
            loading={saveMutation.isPending}
            disabled={!isDirty && !switchesDirty}
            onPress={handleSubmit((v) => saveMutation.mutate(v))}
          />
        ) : (
          <AppText style={{ color: t.textMuted, marginTop: 12 }}>
            Only the group owner can edit these settings.
          </AppText>
        )}

        <AppText style={[styles.section, { color: t.text }]}>Members</AppText>
        <Card elevated="sm" style={{ gap: 8 }}>
          <AppText style={{ color: t.textMuted }}>
            {group.members.length} member{group.members.length === 1 ? '' : 's'}
          </AppText>
          <Button
            title="Manage members"
            variant="secondary"
            onPress={() => router.push(`/groups/${groupId}/members`)}
          />
        </Card>

        <AppText style={[styles.section, { color: t.text }]}>Invite</AppText>
        <Button
          title={inviteLink ? 'Copy invite link again' : 'Generate invite link'}
          variant="secondary"
          loading={inviteMutation.isPending}
          onPress={() => inviteMutation.mutate()}
        />
        {inviteLink ? (
          <AppText style={{ color: t.textMuted, marginTop: 8 }} selectable>
            {inviteLink}
          </AppText>
        ) : null}

        {isOwner && pendingRequests.length > 0 ? (
          <>
            <AppText style={[styles.section, { color: t.text }]}>Edit requests</AppText>
            {pendingRequests.map((er) => (
              <Card key={er.id} style={{ marginBottom: 10, gap: 8 }}>
                <AppText style={{ color: t.text, fontFamily: fonts.semibold }}>
                  {er.expense_description || `Expense #${er.expense_id}`}
                </AppText>
                <AppText style={{ color: t.textMuted, fontSize: 12 }}>
                  Requested by {er.requested_by_name || `user ${er.requested_by_id}`}
                </AppText>
                {er.message ? (
                  <AppText style={{ color: t.textMuted }}>{er.message}</AppText>
                ) : null}
                <View style={{ gap: 4 }}>
                  {Object.entries(er.proposed_changes || {}).map(([key, value]) => (
                    <AppText key={key} style={{ color: t.textMuted, fontSize: 12 }}>
                      {key}: {String(value)}
                    </AppText>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button
                    title="Approve"
                    style={{ flex: 1 }}
                    loading={reviewMutation.isPending}
                    onPress={() =>
                      reviewMutation.mutate({ id: er.id, status: 'approved' })
                    }
                  />
                  <Button
                    title="Reject"
                    variant="danger"
                    style={{ flex: 1 }}
                    loading={reviewMutation.isPending}
                    onPress={() =>
                      reviewMutation.mutate({ id: er.id, status: 'rejected' })
                    }
                  />
                </View>
              </Card>
            ))}
          </>
        ) : null}

        {!isOwner ? (
          <>
            <AppText style={[styles.section, { color: t.text }]}>Leave group</AppText>
            <AppText style={{ color: t.textMuted, marginBottom: 10 }}>
              You can leave only if your balance is settled (API-enforced).
            </AppText>
            <Button
              title="Leave group"
              variant="danger"
              loading={leaveMutation.isPending}
              onPress={() =>
                Alert.alert('Leave group?', 'This removes you from the group.', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Leave',
                    style: 'destructive',
                    onPress: () => leaveMutation.mutate(),
                  },
                ])
              }
            />
          </>
        ) : (
          <>
            <AppText style={[styles.section, { color: t.danger }]}>Delete group</AppText>
            <AppText style={{ color: t.textMuted, marginBottom: 10 }}>
              Only the owner can delete. This permanently removes the group.
            </AppText>
            <TextField
              label={`Type "${group.name}" to confirm`}
              value={confirmDelete}
              onChangeText={setConfirmDelete}
            />
            <Button
              title="Delete group"
              variant="danger"
              style={{ marginTop: 12 }}
              disabled={confirmDelete !== group.name}
              loading={deleteMutation.isPending}
              onPress={() =>
                Alert.alert('Delete permanently?', 'This cannot be undone.', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => deleteMutation.mutate(),
                  },
                ])
              }
            />
          </>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  section: { fontSize: 16, fontFamily: fonts.bold, marginTop: 24, marginBottom: 10 },
});
