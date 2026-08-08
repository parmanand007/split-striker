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
import { useEffect } from 'react';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormValues = z.infer<typeof schema>;

export default function SignupScreen() {
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const nextPath = Array.isArray(next) ? next[0] : next;
  const { busy, error, clearError, signUp } = useAuthActions();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '' },
  });

  useEffect(() => () => clearError(), [clearError]);

  const onSubmit = handleSubmit(async (values) => {
    await signUp(values.name, values.email, values.password, nextPath);
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
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.sub}>Join Split Striker Wise free.</Text>

        <AuthErrorBanner message={error} />

        <View style={styles.form}>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextField
                dark
                label="Name"
                autoComplete="name"
                textContentType="name"
                value={value}
                onBlur={onBlur}
                onChangeText={(text) => {
                  clearError();
                  onChange(text);
                }}
                error={errors.name?.message}
                placeholder="Full name"
              />
            )}
          />
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextField
                dark
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
                label="Password"
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
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
            title="Create free account →"
            variant="marketing"
            loading={busy}
            onPress={onSubmit}
          />
        </View>
      </AuthCard>

      <Link
        href={
          nextPath
            ? { pathname: '/(auth)/login', params: { next: nextPath } }
            : '/(auth)/login'
        }
        style={styles.link}
      >
        <Text style={styles.linkText}>Already have an account? Sign in</Text>
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
