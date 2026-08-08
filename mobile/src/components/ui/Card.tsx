import { StyleSheet, View, ViewProps } from 'react-native';
import { useThemeStore } from '@/src/stores/themeStore';

export function Card({ style, ...rest }: ViewProps) {
  const t = useThemeStore((s) => s.tokens);
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: t.cardBg,
          borderColor: t.cardBorder,
          borderRadius: t.radiusMd,
        },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    padding: 20, // web .card p-5
    // web shadow-sm
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
});
