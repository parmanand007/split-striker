import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MARKETING } from '@/src/theme/themes';
import { useThemeStore } from '@/src/stores/themeStore';

/** Dark auth canvas matching web UserSelectPage / LandingPage. */
export function AuthShell({
  children,
  scroll = true,
}: {
  children: ReactNode;
  scroll?: boolean;
}) {
  const blobs = useThemeStore((s) => s.tokens);

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      bounces
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, styles.scroll]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <LinearGradient
        colors={[MARKETING.bg, MARKETING.bgMid, MARKETING.bg]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[styles.blob, styles.blobA, { backgroundColor: blobs.blobA }]}
      />
      <View
        pointerEvents="none"
        style={[styles.blob, styles.blobB, { backgroundColor: blobs.blobB }]}
      />
      <View
        pointerEvents="none"
        style={[styles.blob, styles.blobC, { backgroundColor: blobs.blobC }]}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {body}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AuthCard({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: MARKETING.bg },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
  },
  blobA: {
    width: 280,
    height: 280,
    top: -80,
    right: -60,
    opacity: 0.28,
  },
  blobB: {
    width: 240,
    height: 240,
    bottom: -70,
    left: -50,
    opacity: 0.2,
  },
  blobC: {
    width: 160,
    height: 160,
    top: '42%',
    left: '28%',
    opacity: 0.14,
  },
  card: {
    // web: bg-white/[0.07] backdrop-blur border-white/10 rounded-3xl
    backgroundColor: MARKETING.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: MARKETING.cardBorder,
    padding: 28,
    overflow: 'hidden',
  },
});
