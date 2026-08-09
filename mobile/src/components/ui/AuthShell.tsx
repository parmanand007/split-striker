import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MARKETING } from '@/src/theme/themes';
import { shadow } from '@/src/theme/tokens';

/** Dark auth canvas — fixed marketing palette (not theme-switched). */
export function AuthShell({
  children,
  scroll = true,
}: {
  children: ReactNode;
  scroll?: boolean;
}) {
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
        colors={[MARKETING.bg, MARKETING.bgMid, '#1c0509', MARKETING.bg]}
        locations={[0, 0.35, 0.7, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[styles.blob, styles.blobA, { backgroundColor: MARKETING.accent }]}
      />
      <View
        pointerEvents="none"
        style={[styles.blob, styles.blobB, { backgroundColor: MARKETING.brand800 }]}
      />
      <View
        pointerEvents="none"
        style={[styles.blob, styles.blobC, { backgroundColor: MARKETING.accentSoft }]}
      />
      {/* Soft vignette */}
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', 'rgba(8,13,20,0.55)']}
        style={styles.vignette}
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
  return (
    <View style={[styles.cardOuter, shadow('lg')]}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
      ) : null}
      <LinearGradient
        colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.04)']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.cardInner}>{children}</View>
    </View>
  );
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
    width: 300,
    height: 300,
    top: -110,
    right: -90,
    opacity: 0.22,
  },
  blobB: {
    width: 240,
    height: 240,
    bottom: -100,
    left: -80,
    opacity: 0.14,
  },
  blobC: {
    width: 140,
    height: 140,
    top: '10%',
    left: '58%',
    opacity: 0.1,
  },
  vignette: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '35%',
  },
  cardOuter: {
    backgroundColor: MARKETING.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: MARKETING.cardBorder,
    overflow: 'hidden',
  },
  cardInner: {
    padding: 26,
  },
});
