import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Group } from '@/src/types/api';
import { useThemeStore } from '@/src/stores/themeStore';
import { AppText } from '@/src/components/ui/AppText';
import { Avatar } from '@/src/components/ui/Avatar';
import { fonts } from '@/src/theme/typography';
import { motion, shadow } from '@/src/theme/tokens';

interface Props {
  group: Group;
  balanceLabel?: string;
  onPress: () => void;
}

export function GroupRow({ group, balanceLabel, onPress }: Props) {
  const t = useThemeStore((s) => s.tokens);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          borderColor: t.cardBorder,
          backgroundColor: t.cardBg,
          opacity: pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? motion.pressScale : 1 }],
          ...shadow('sm'),
        },
      ]}
    >
      <Avatar name={group.emoji || group.name} seed={group.id} size={42} />
      <View style={styles.meta}>
        <AppText variant="titleSm" numberOfLines={1} style={{ fontSize: 16 }}>
          {group.name}
        </AppText>
        <AppText muted variant="caption">
          {(group.members?.length ?? 0)} members · {group.currency}
          {group.archived ? ' · archived' : ''}
        </AppText>
      </View>
      <AppText muted variant="caption" style={{ fontFamily: fonts.bold, marginRight: 2 }}>
        {balanceLabel ?? 'Open'}
      </AppText>
      <Ionicons name="chevron-forward" size={16} color={t.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 68,
  },
  meta: { flex: 1, gap: 2 },
});
