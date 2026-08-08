import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pressable, StyleSheet, View } from 'react-native';
import { TextField } from '@/src/components/ui/TextField';
import { Button } from '@/src/components/ui/Button';
import { AuthErrorBanner } from '@/src/components/ui/AuthErrorBanner';
import { AuthCard, AuthShell } from '@/src/components/ui/AuthShell';
import { LogoWordmark } from '@/src/components/ui/Logo';
import { AppText } from '@/src/components/ui/AppText';
import { MARKETING } from '@/src/theme/themes';
import { fonts } from '@/src/theme/typography';
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
        <AppText style={styles.back}>← Back</AppText>
      </Pressable>

      <View style={styles.brand}>
        <LogoWordmark size="lg" subtitle="Split expenses. Stay friends." />
      </View>

      <AuthCard>
        <AppText style={styles.title}>Welcome back</AppText>
        <AppText style={styles.sub}>Sign in to your account.</AppText>

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
            title="Sign in"
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
        <AppText style={styles.linkText}>Need an account? Sign up</AppText>
      </Link>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  backBtn: { minHeight: 44, justifyContent: 'center', marginBottom: 8 },
  back: { color: MARKETING.textMuted, fontFamily: fonts.semibold },
  brand: { alignItems: 'center', marginBottom: 28 },
  title: {
    color: '#fff',
    fontSize: 20,
    fontFamily: fonts.bold,
    marginBottom: 4,
  },
  sub: { color: MARKETING.textMuted, fontSize: 14, marginBottom: 20 },
  form: { gap: 12 },
  link: { marginTop: 20, alignSelf: 'center', minHeight: 44, justifyContent: 'center' },
  linkText: { color: MARKETING.accentSoft, fontFamily: fonts.semibold },
});
