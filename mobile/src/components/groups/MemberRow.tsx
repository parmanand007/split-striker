import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { User } from '@/src/types/api';
import { useThemeStore } from '@/src/stores/themeStore';
import { Avatar } from '@/src/components/ui/Avatar';
import { AppText } from '@/src/components/ui/AppText';
import { shadow, space } from '@/src/theme/tokens';

interface Props {
  user: User;
  isOwner?: boolean;
  isYou?: boolean;
  balanceLabel?: string;
  balanceTone?: 'positive' | 'negative' | 'neutral';
  onAction?: () => void;
  actionPending?: boolean;
  actionLabel?: string;
  actionTone?: 'danger' | 'brand';
  actionIcon?: keyof typeof Ionicons.glyphMap;
}

export function MemberRow({
  user,
  isOwner,
  isYou,
  balanceLabel,
  balanceTone = 'neutral',
  onAction,
  actionPending,
  actionLabel = 'Remove',
  actionTone = 'danger',
  actionIcon = 'person-remove-outline',
}: Props) {
  const t = useThemeStore((s) => s.tokens);
  const toneColor =
    balanceTone === 'positive'
      ? t.positive
      : balanceTone === 'negative'
        ? t.negative
        : t.textMuted;
  const actionColor = actionTone === 'brand' ? t.brand500 : t.danger;

  return (
    <View
      style={[
        styles.row,
        shadow('sm'),
        { borderColor: t.cardBorder, backgroundColor: t.cardBg },
      ]}
    >
      <Avatar name={user.name} seed={user.id} size={42} avatarUrl={user.avatar_url} />
      <View style={{ flex: 1 }}>
        <AppText variant="body" style={{ fontWeight: '700' }} numberOfLines={1}>
          {user.name}
          {isYou ? ' (you)' : ''}
        </AppText>
        <AppText muted variant="caption" numberOfLines={1} style={{ marginTop: 2 }}>
          {user.email || 'No email'}
          {isOwner ? ' · owner' : ''}
        </AppText>
      </View>
      {balanceLabel ? (
        <AppText style={{ color: toneColor, fontWeight: '700', marginRight: 8 }} variant="caption">
          {balanceLabel}
        </AppText>
      ) : null}
      {onAction ? (
        <Pressable
          onPress={onAction}
          disabled={actionPending}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={styles.removeBtn}
        >
          {actionPending ? (
            <ActivityIndicator size="small" color={actionColor} />
          ) : (
            <>
              <Ionicons name={actionIcon} size={16} color={actionColor} />
              <AppText style={{ color: actionColor, fontWeight: '700' }} variant="caption">
                {actionLabel}
              </AppText>
            </>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 68,
  },
  removeBtn: { alignItems: 'center', gap: 2, minWidth: 52 },
});
