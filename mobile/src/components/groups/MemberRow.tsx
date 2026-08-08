import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { User } from '@/src/types/api';
import { useThemeStore } from '@/src/stores/themeStore';
import { groupColor } from '@/src/features/groups/constants';

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
        { borderColor: t.cardBorder, backgroundColor: t.cardBg },
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: groupColor(user.id) }]}>
        <Text style={styles.avatarText}>{user.name.slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
          {user.name}
          {isYou ? ' (you)' : ''}
        </Text>
        <Text style={{ color: t.textMuted, fontSize: 12 }} numberOfLines={1}>
          {user.email || 'No email'}
          {isOwner ? ' · owner' : ''}
        </Text>
      </View>
      {balanceLabel ? (
        <Text style={{ color: toneColor, fontWeight: '700', marginRight: 8 }}>{balanceLabel}</Text>
      ) : null}
      {onAction ? (
        <Pressable
          onPress={onAction}
          disabled={actionPending}
          hitSlop={8}
          style={styles.removeBtn}
        >
          {actionPending ? (
            <ActivityIndicator size="small" color={actionColor} />
          ) : (
            <>
              <Ionicons name={actionIcon} size={16} color={actionColor} />
              <Text style={{ color: actionColor, fontSize: 12, fontWeight: '700' }}>
                {actionLabel}
              </Text>
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
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 64,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  name: { fontSize: 15, fontWeight: '700' },
  removeBtn: { alignItems: 'center', gap: 2, minWidth: 52 },
});
