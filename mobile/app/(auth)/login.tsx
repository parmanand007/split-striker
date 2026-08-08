import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { TextField } from '@/src/components/ui/TextField';
import { Button } from '@/src/components/ui/Button';
import { AuthErrorBanner } from '@/src/components/ui/AuthErrorBanner';
import { AuthCard, AuthShell } from '@/src/components/ui/AuthShell';
import { MARKETING } from '@/src/theme/themes';
import { useAuthActions } from '@/src/features/auth/useAuthActions';
import { useAuthStore } from '@/src/stores/authStore';
import { useEffect } from 'react';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormValues = z.infer<typeof schema>;

export default function LoginScreen() {
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { busy, error, clearError, signIn } = useAuthActions();
  const sessionExpiredMessage = useAuthStore((s) => s.sessionExpiredMessage);
  const clearSessionExpiredMessage = useAuthStore((s) => s.clearSessionExpiredMessage);
  const nextPath = Array.isArray(next) ? next[0] : next;

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => () => clearError(), [clearError]);

  const onSubmit = handleSubmit(async (values) => {
    clearSessionExpiredMessage();
    await signIn(values.email, values.password, nextPath);
  });

  return (
    <AuthShell>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={styles.backBtn}
      >
        <Text style={styles.back}>← Back</Text>
      </Pressable>

      <View style={styles.brand}>
        <LinearGradient
          colors={[MARKETING.brand800, MARKETING.brand600, MARKETING.accentSoft]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.logo}
        >
          <Ionicons name="flash" size={22} color="#fff" />
        </LinearGradient>
        <Text style={styles.wordmark}>Split Striker Wise</Text>
        <Text style={styles.tagline}>Split expenses. Stay friends.</Text>
      </View>

      <AuthCard>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.sub}>Sign in to your account.</Text>

        <AuthErrorBanner message={error || sessionExpiredMessage} />

        <View style={styles.form}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextField
                dark
                testID="login-email"
                label="Email"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                value={value}
                onBlur={onBlur}
                onChangeText={(text) => {
                  clearError();
                  onChange(text);
                }}
                error={errors.email?.message}
                placeholder="you@example.com"
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextField
                dark
                testID="login-password"
                label="Password"
                secureTextEntry
                autoComplete="off"
                textContentType="none"
                passwordRules=""
                value={value}
                onBlur={onBlur}
                onChangeText={(text) => {
                  clearError();
                  onChange(text);
                }}
                error={errors.password?.message}
                placeholder="Password"
                onSubmitEditing={onSubmit}
                returnKeyType="go"
              />
            )}
          />

          <Button
            title="Sign in →"
            variant="marketing"
            testID="login-submit"
            loading={busy}
            onPress={onSubmit}
          />
        </View>
      </AuthCard>

      <Link
        href={
          nextPath
            ? { pathname: '/(auth)/signup', params: { next: nextPath } }
            : '/(auth)/signup'
        }
        style={styles.link}
      >
        <Text style={styles.linkText}>Need an account? Sign up</Text>
      </Link>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  backBtn: { minHeight: 44, justifyContent: 'center', marginBottom: 8 },
  back: { color: MARKETING.textMuted, fontWeight: '600' },
  brand: { alignItems: 'center', marginBottom: 28, gap: 10 },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: { color: '#fff', fontSize: 20, fontWeight: '800' },
  tagline: { color: MARKETING.textMuted, fontSize: 14 },
  title: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 4 },
  sub: { color: MARKETING.textMuted, fontSize: 14, marginBottom: 20 },
  form: { gap: 12 },
  link: { marginTop: 20, alignSelf: 'center', minHeight: 44, justifyContent: 'center' },
  linkText: { color: MARKETING.accentSoft, fontWeight: '600' },
});
