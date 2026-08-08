import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { acceptInvite, getInvite } from '@/src/api/groups';
import { useAuthStore } from '@/src/stores/authStore';
import { Button } from '@/src/components/ui/Button';
import { AuthCard, AuthShell } from '@/src/components/ui/AuthShell';
import { ErrorView, LoadingView } from '@/src/components/ui/StateViews';
import { MARKETING } from '@/src/theme/themes';
import { ApiError } from '@/src/types/api';

function paramToString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

export default function InviteScreen() {
  const params = useLocalSearchParams<{ token: string | string[] }>();
  const token = paramToString(params.token);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const returnPath = `/invite/${token}`;

  const inviteQuery = useQuery({
    queryKey: ['invite', token],
    queryFn: () => getInvite(token),
    enabled: !!token,
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Sign in required');
      return acceptInvite(token, user.id);
    },
    onSuccess: (data) => {
      router.replace(`/groups/${data.group_id}`);
    },
    onError: (e) => {
      Alert.alert('Invite error', e instanceof ApiError ? e.detail : String(e));
    },
  });

  if (!token) {
    return (
      <AuthShell scroll={false}>
        <ErrorView message="Invalid invite link" framed={false} />
      </AuthShell>
    );
  }
  if (inviteQuery.isLoading) {
    return (
      <AuthShell scroll={false}>
        <LoadingView label="Loading invite…" framed={false} />
      </AuthShell>
    );
  }
  if (inviteQuery.isError || !inviteQuery.data) {
    return (
      <AuthShell scroll={false}>
        <ErrorView
          framed={false}
          message={
            inviteQuery.error instanceof ApiError ? inviteQuery.error.detail : 'Invalid invite'
          }
          onRetry={() => void inviteQuery.refetch()}
        />
      </AuthShell>
    );
  }

  const invite = inviteQuery.data;

  return (
    <AuthShell>
      <View style={styles.center}>
        <AuthCard>
          <Text style={styles.eyebrow}>GROUP INVITE</Text>
          <Text style={styles.title}>{invite.group_name}</Text>
          <Text style={styles.meta}>
            Invited by {invite.invited_by} · {invite.member_count} members ·{' '}
            {invite.group_currency}
          </Text>

          {user ? (
            <Button
              title="Join group"
              variant="marketing"
              loading={acceptMutation.isPending}
              onPress={() => acceptMutation.mutate()}
            />
          ) : (
            <Button
              title="Sign in to join"
              variant="marketing"
              onPress={() =>
                router.push({
                  pathname: '/(auth)/login',
                  params: { next: returnPath },
                })
              }
            />
          )}
        </AuthCard>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  center: { flexGrow: 1, justifyContent: 'center' },
  eyebrow: {
    color: MARKETING.accentSoft,
    fontWeight: '800',
    letterSpacing: 1,
    fontSize: 11,
    marginBottom: 8,
  },
  title: { color: '#fff', fontSize: 26, fontWeight: '800', marginBottom: 8 },
  meta: { color: MARKETING.textMuted, marginBottom: 20, lineHeight: 20 },
});
