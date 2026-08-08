import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Group } from '@/src/types/api';
import { useThemeStore } from '@/src/stores/themeStore';

// Match web Sidebar GROUP_COLORS (violet/sky/amber/rose/teal/orange).
const COLORS = ['#8b5cf6', '#0ea5e9', '#f59e0b', '#f43f5e', '#14b8a6', '#f97316'];

interface Props {
  group: Group;
  balanceLabel?: string;
  onPress: () => void;
}

export function GroupRow({ group, balanceLabel, onPress }: Props) {
  const t = useThemeStore((s) => s.tokens);
  const color = COLORS[group.id % COLORS.length];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderColor: t.cardBorder, backgroundColor: t.cardBg, opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: color }]}>
        <Text style={styles.emoji}>{group.emoji || group.name.slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={styles.meta}>
        <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
          {group.name}
        </Text>
        <Text style={{ color: t.textMuted, fontSize: 13 }}>
          {group.members.length} members · {group.currency}
          {group.archived ? ' · archived' : ''}
        </Text>
      </View>
      <Text style={{ color: t.textMuted, fontSize: 13, marginRight: 4 }}>
        {balanceLabel ?? 'Open'}
      </Text>
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
    borderWidth: 1,
    minHeight: 64,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { color: '#fff', fontWeight: '700', fontSize: 16 },
  meta: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '700' },
});
