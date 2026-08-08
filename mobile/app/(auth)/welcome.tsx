import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MARKETING } from '@/src/theme/themes';
import { Button } from '@/src/components/ui/Button';
import { AuthErrorBanner } from '@/src/components/ui/AuthErrorBanner';
import { AuthShell } from '@/src/components/ui/AuthShell';
import { LogoWordmark } from '@/src/components/ui/Logo';
import { AppText, Sparkle } from '@/src/components/ui/AppText';
import { useAuthStore } from '@/src/stores/authStore';
import { fonts } from '@/src/theme/typography';

const FEATURES = [
  { icon: 'people' as const, title: 'Group expenses' },
  { icon: 'flash' as const, title: 'Smart splitting' },
  { icon: 'swap-horizontal' as const, title: 'Clear settlements' },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const sessionExpiredMessage = useAuthStore((s) => s.sessionExpiredMessage);
  const clearSessionExpiredMessage = useAuthStore((s) => s.clearSessionExpiredMessage);

  return (
    <AuthShell>
      <View style={styles.header}>
        <LogoWordmark size="lg" />
      </View>

      <AuthErrorBanner
        message={sessionExpiredMessage}
        onDismiss={clearSessionExpiredMessage}
      />

      <View style={styles.hero}>
        <View style={styles.badgeRow}>
          <AppText style={styles.badge}>100% free — no credit card</AppText>
          <Sparkle color={MARKETING.accentBright} />
        </View>
        <AppText style={styles.h1}>
          Split bills,{' '}
          <AppText style={styles.accent}>not friendships.</AppText>
        </AppText>
        <AppText style={styles.body}>
          Track shared expenses, see who owes what, and settle up without the awkward math.
        </AppText>
      </View>

      <AppText style={styles.sectionEyebrow}>How it works</AppText>
      <AppText style={styles.sectionTitle}>Three steps to stress-free splitting</AppText>
      {[
        ['1', 'Create a group', 'Add the people you spend with.'],
        ['2', 'Add expenses', 'Equal, exact, percentage, or shares.'],
        ['3', 'Settle up', 'Follow the suggested payments.'],
      ].map(([n, title, desc]) => (
        <View key={n} style={styles.step}>
          <View style={styles.stepNum}>
            <AppText style={styles.stepNumText}>{n}</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText style={styles.stepTitle}>{title}</AppText>
            <AppText style={styles.body}>{desc}</AppText>
          </View>
        </View>
      ))}

      <AppText style={[styles.sectionEyebrow, { marginTop: 28 }]}>Built for</AppText>
      <AppText style={styles.sectionTitle}>Everyday shared spending</AppText>
      <View style={styles.featureList}>
        {FEATURES.map((f) => (
          <View key={f.title} style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Ionicons name={f.icon} size={16} color="#fff" />
            </View>
            <AppText style={styles.featureTitle}>{f.title}</AppText>
          </View>
        ))}
      </View>

      <View style={styles.ctaBlock}>
        <Button
          title="Create your free account"
          variant="marketing"
          testID="welcome-signup"
          onPress={() => router.push('/(auth)/signup')}
        />
        <Pressable
          testID="welcome-login"
          accessibilityRole="button"
          accessibilityLabel="Already have an account? Sign in"
          onPress={() => router.push('/(auth)/login')}
          style={styles.signIn}
        >
          <AppText style={styles.signInText}>Already have an account? Sign in</AppText>
        </Pressable>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 28 },
  hero: { gap: 12, marginBottom: 32 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    color: MARKETING.accentSoft,
    backgroundColor: 'rgba(190,18,64,0.16)',
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    fontSize: 12,
    fontFamily: fonts.semibold,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(230,51,88,0.35)',
  },
  h1: {
    color: '#fff',
    fontSize: 34,
    lineHeight: 40,
    fontFamily: fonts.extrabold,
  },
  accent: {
    color: MARKETING.accentSoft,
    fontSize: 34,
    lineHeight: 40,
    fontFamily: fonts.extrabold,
  },
  body: { color: MARKETING.textMuted, fontSize: 15, lineHeight: 22 },
  sectionEyebrow: {
    color: MARKETING.accentSoft,
    fontSize: 11,
    fontFamily: fonts.bold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 22,
    fontFamily: fonts.extrabold,
    marginBottom: 16,
  },
  step: { flexDirection: 'row', gap: 12, marginBottom: 14, alignItems: 'flex-start' },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: MARKETING.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { color: '#fff', fontFamily: fonts.extrabold },
  stepTitle: { color: '#fff', fontFamily: fonts.bold, marginBottom: 2 },
  featureList: { gap: 10, marginBottom: 28 },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: MARKETING.cardBorder,
  },
  featureIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MARKETING.accent,
  },
  featureTitle: { color: '#fff', fontFamily: fonts.bold, fontSize: 15 },
  ctaBlock: { marginTop: 8, marginBottom: 24 },
  signIn: { marginTop: 16, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  signInText: { color: MARKETING.accentSoft, fontFamily: fonts.semibold, fontSize: 15 },
});
