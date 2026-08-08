import { Pressable, StyleSheet, View } from 'react-native';
import { MARKETING } from '@/src/theme/themes';
import { fonts } from '@/src/theme/typography';
import { AppText } from './AppText';

export function AuthErrorBanner({
  message,
  onDismiss,
}: {
  message: string | null;
  onDismiss?: () => void;
}) {
  if (!message) return null;
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <View style={styles.row}>
        <View style={styles.dot} />
        <AppText style={styles.text}>{message}</AppText>
      </View>
      {onDismiss ? (
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          hitSlop={8}
          style={styles.dismiss}
        >
          <AppText style={styles.dismissText}>Dismiss</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: 'rgba(225, 29, 72, 0.18)',
    borderWidth: 1,
    borderColor: MARKETING.accent,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 12,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: MARKETING.negative,
    marginTop: 7,
  },
  text: {
    color: MARKETING.negative,
    fontSize: 13,
    fontFamily: fonts.semibold,
    lineHeight: 18,
    flex: 1,
  },
  dismiss: { minHeight: 32, justifyContent: 'center' },
  dismissText: { color: '#fff', fontFamily: fonts.bold, fontSize: 13 },
});
