import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { Alert, Share, StyleSheet, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { createInvite } from '@/src/api/groups';
import { useThemeStore } from '@/src/stores/themeStore';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { AppText } from '@/src/components/ui/AppText';
import { TextField } from '@/src/components/ui/TextField';
import { ApiError } from '@/src/types/api';
import { useState } from 'react';

type Props = {
  groupId: number;
  actorUserId: number;
  compact?: boolean;
};

export function GroupInviteCard({ groupId, actorUserId, compact }: Props) {
  const t = useThemeStore((s) => s.tokens);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [emailHint, setEmailHint] = useState('');

  const inviteMutation = useMutation({
    mutationFn: () => createInvite(groupId, actorUserId, emailHint.trim() || undefined),
    onSuccess: async (data) => {
      const link = Linking.createURL(`/invite/${data.token}`);
      setInviteLink(link);
      await Clipboard.setStringAsync(link);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
      Alert.alert(
        'Invite link copied',
        emailHint.trim()
          ? `Share this link with ${emailHint.trim()} so they can join the group.`
          : 'Share this link so others can join your group.',
      );
    },
    onError: (e) =>
      Alert.alert('Invite failed', e instanceof ApiError ? e.detail : String(e)),
  });

  const shareLink = async () => {
    if (!inviteLink) {
      inviteMutation.mutate();
      return;
    }
    try {
      await Share.share({
        message: `Join our group on Split Striker Wise:\n${inviteLink}`,
        url: inviteLink,
      });
    } catch {
      await Clipboard.setStringAsync(inviteLink);
      Alert.alert('Copied', 'Invite link copied to clipboard.');
    }
  };

  return (
    <Card elevated={compact ? 'sm' : 'md'} style={{ gap: 12 }}>
      <View style={styles.head}>
        <View style={[styles.iconWrap, { backgroundColor: t.brand50 }]}>
          <Ionicons name="mail-outline" size={22} color={t.brand500} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="titleSm">Invite members</AppText>
          <AppText muted variant="bodySm" style={{ marginTop: 4 }}>
            People can only join this group through an invite link — not by direct add.
          </AppText>
        </View>
      </View>

      <TextField
        label="Invitee email (optional)"
        value={emailHint}
        onChangeText={setEmailHint}
        placeholder="friend@email.com"
        autoCapitalize="none"
        keyboardType="email-address"
        textContentType="emailAddress"
      />

      <Button
        title={inviteLink ? 'Copy invite link again' : 'Generate invite link'}
        loading={inviteMutation.isPending}
        onPress={() => inviteMutation.mutate()}
      />
      <Button
        title="Share invite link"
        variant="secondary"
        disabled={inviteMutation.isPending}
        onPress={() => void shareLink()}
      />

      {inviteLink ? (
        <AppText muted variant="caption" selectable style={{ lineHeight: 18 }}>
          {inviteLink}
        </AppText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
