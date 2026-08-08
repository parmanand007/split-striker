import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { MARKETING } from '@/src/theme/themes';
import { Button } from '@/src/components/ui/Button';
import { AuthErrorBanner } from '@/src/components/ui/AuthErrorBanner';
import { AuthShell } from '@/src/components/ui/AuthShell';
import { useAuthStore } from '@/src/stores/authStore';

const FEATURES = [
  { icon: 'people' as const, title: 'Group expenses', color: '#7c3aed' },
  { icon: 'flash' as const, title: 'Smart splitting', color: MARKETING.accent },
  { icon: 'bar-chart' as const, title: 'Real-time balances', color: '#0d9488' },
  { icon: 'globe' as const, title: 'Multi-currency', color: '#16a34a' },
  { icon: 'link' as const, title: 'Invite via link', color: '#ea580c' },
  { icon: 'shield-checkmark' as const, title: 'Private & secure', color: MARKETING.accent },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const sessionExpiredMessage = useAuthStore((s) => s.sessionExpiredMessage);
  const clearSessionExpiredMessage = useAuthStore((s) => s.clearSessionExpiredMessage);

  return (
    <AuthShell>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <LinearGradient
            colors={[MARKETING.brand800, MARKETING.brand600, MARKETING.accentSoft]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logo}
          >
            <Ionicons name="flash" size={18} color="#fff" />
          </LinearGradient>
          <Text style={styles.brand}>Split Striker Wise</Text>
        </View>
      </View>

      <AuthErrorBanner
        message={sessionExpiredMessage}
        onDismiss={clearSessionExpiredMessage}
      />

      <View style={styles.hero}>
        <Text style={styles.badge}>100% free — no credit card</Text>
        <Text style={styles.h1}>
          Split bills, <Text style={styles.accent}>not friendships.</Text>
        </Text>
        <Text style={styles.body}>
          Track shared expenses, see who owes what, and settle up without the awkward math.
        </Text>
      </View>

      <View style={styles.preview}>
        <Text style={styles.previewTitle}>Goa Trip 2026</Text>
        <Text style={styles.previewMeta}>4 members · 6 expenses</Text>
        <View style={styles.previewRow}>
          <Text style={styles.previewItem}>Beach dinner</Text>
          <Text style={styles.previewAmt}>₹2,800</Text>
        </View>
        <View style={styles.previewRow}>
          <Text style={styles.previewItem}>Surfing lesson</Text>
          <Text style={styles.previewAmt}>₹1,500</Text>
        </View>
        <Text style={[styles.previewMeta, { marginTop: 10 }]}>YOUR BALANCES</Text>
        <Text style={styles.positive}>Alex owes you +₹933</Text>
      </View>

      <Text style={styles.sectionEyebrow}>HOW IT WORKS</Text>
      <Text style={styles.sectionTitle}>Three steps to stress-free splitting</Text>
      {[
        ['1', 'Create a group', 'Add the people you spend with.'],
        ['2', 'Add expenses', 'Equal, exact, percentage, or shares.'],
        ['3', 'Settle up', 'Follow the suggested payments.'],
      ].map(([n, title, desc]) => (
        <View key={n} style={styles.step}>
          <View style={styles.stepNum}>
            <Text style={styles.stepNumText}>{n}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepTitle}>{title}</Text>
            <Text style={styles.body}>{desc}</Text>
          </View>
        </View>
      ))}

      <Text style={[styles.sectionEyebrow, { marginTop: 28 }]}>FEATURES</Text>
      <Text style={styles.sectionTitle}>{"Everything you need, nothing you don't"}</Text>
      <View style={styles.featureGrid}>
        {FEATURES.map((f) => (
          <View key={f.title} style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: f.color }]}>
              <Ionicons name={f.icon} size={16} color="#fff" />
            </View>
            <Text style={styles.featureTitle}>{f.title}</Text>
          </View>
        ))}
      </View>

      <View style={styles.ctaBlock}>
        <Button
          title="Create your free account →"
          variant="marketing"
          onPress={() => router.push('/(auth)/signup')}
        />
        <Pressable onPress={() => router.push('/(auth)/login')} style={styles.signIn}>
          <Text style={styles.signInText}>Already have an account? Sign in</Text>
        </Pressable>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 24 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { color: '#fff', fontSize: 16, fontWeight: '700' },
  hero: { gap: 12, marginBottom: 24 },
  badge: {
    alignSelf: 'flex-start',
    color: MARKETING.accentSoft,
    backgroundColor: 'rgba(190,18,64,0.12)',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '600',
  },
  h1: { color: '#fff', fontSize: 34, fontWeight: '800', lineHeight: 40 },
  accent: { color: MARKETING.accentSoft },
  body: { color: MARKETING.textMuted, fontSize: 15, lineHeight: 22 },
  preview: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 24,
    padding: 16,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: MARKETING.cardBorder,
  },
  previewTitle: { color: '#fff', fontWeight: '700', fontSize: 16 },
  previewMeta: { color: MARKETING.textMuted, fontSize: 12, marginTop: 4, marginBottom: 10 },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  previewItem: { color: '#e2e8f0' },
  previewAmt: { color: '#fff', fontWeight: '600' },
  positive: { color: MARKETING.success, fontWeight: '600', marginTop: 4 },
  sectionEyebrow: {
    color: MARKETING.accentSoft,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  sectionTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 16 },
  step: { flexDirection: 'row', gap: 12, marginBottom: 14, alignItems: 'flex-start' },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: MARKETING.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { color: '#fff', fontWeight: '800' },
  stepTitle: { color: '#fff', fontWeight: '700', marginBottom: 2 },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  featureCard: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: MARKETING.cardBorder,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: { color: '#fff', fontWeight: '700', fontSize: 14 },
  ctaBlock: { marginTop: 8, marginBottom: 24 },
  signIn: { marginTop: 16, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  signInText: { color: MARKETING.accentSoft, fontWeight: '600', fontSize: 15 },
});
