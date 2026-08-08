import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { AppText } from '@/src/components/ui/AppText';
import { fonts } from '@/src/theme/typography';
import { acceptInvite, getInvite } from '@/src/api/groups';
import { useAuthStore } from '@/src/stores/authStore';
import { Button } from '@/src/components/ui/Button';
import { AuthCard, AuthShell } from '@/src/components/ui/AuthShell';
import { LogoMark } from '@/src/components/ui/Logo';
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
        <View style={styles.center}>
          <AuthCard>
            <AppText style={styles.title}>Invalid invite link</AppText>
            <AppText style={styles.meta}>This invite URL is missing or malformed.</AppText>
          </AuthCard>
        </View>
      </AuthShell>
    );
  }
  if (inviteQuery.isLoading) {
    return (
      <AuthShell scroll={false}>
        <View style={[styles.center, { alignItems: 'center', gap: 12 }]}>
          <ActivityIndicator color={MARKETING.accentSoft} size="large" />
          <AppText style={styles.meta}>Loading invite…</AppText>
        </View>
      </AuthShell>
    );
  }
  if (inviteQuery.isError || !inviteQuery.data) {
    return (
      <AuthShell scroll={false}>
        <View style={styles.center}>
          <AuthCard>
            <AppText style={styles.title}>Invite unavailable</AppText>
            <AppText style={styles.meta}>
              {inviteQuery.error instanceof ApiError
                ? inviteQuery.error.detail
                : 'Invalid invite'}
            </AppText>
            <Button title="Try again" variant="marketing" onPress={() => void inviteQuery.refetch()} />
          </AuthCard>
        </View>
      </AuthShell>
    );
  }

  const invite = inviteQuery.data;

  return (
    <AuthShell>
      <View style={styles.center}>
        <AuthCard>
          <View style={styles.brand}>
            <LogoMark size="md" />
          </View>
          <AppText style={styles.eyebrow}>GROUP INVITE</AppText>
          <AppText style={styles.title}>{invite.group_name}</AppText>
          <AppText style={styles.meta}>
            Invited by {invite.invited_by} · {invite.member_count} members ·{' '}
            {invite.group_currency}
          </AppText>

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
  brand: { alignItems: 'center', marginBottom: 16 },
  eyebrow: {
    color: MARKETING.accentSoft,
    fontFamily: fonts.extrabold,
    letterSpacing: 1,
    fontSize: 11,
    marginBottom: 8,
  },
  title: { color: '#fff', fontSize: 26, fontFamily: fonts.extrabold, marginBottom: 8 },
  meta: { color: MARKETING.textMuted, marginBottom: 20, lineHeight: 20 },
});
