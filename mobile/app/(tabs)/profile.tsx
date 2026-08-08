import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/stores/authStore';
import { useThemeStore } from '@/src/stores/themeStore';
import { THEME_LIST } from '@/src/theme/themes';
import { Screen } from '@/src/components/ui/Screen';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { AppText } from '@/src/components/ui/AppText';
import { Avatar } from '@/src/components/ui/Avatar';
import { LogoMark } from '@/src/components/ui/Logo';
import { APP_ENV, IS_DEV, apiUrlHint } from '@/src/config/env';
import { useAuthActions } from '@/src/features/auth/useAuthActions';
import * as Haptics from 'expo-haptics';

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const { themeId, setTheme } = useThemeStore();
  const { busy, signOut } = useAuthActions();
  const router = useRouter();

  const onLogout = () => {
    Alert.alert('Log out', 'Sign out of Split Striker Wise?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => {
          void signOut();
        },
      },
    ]);
  };

  return (
    <Screen inTabs scroll>
      <View style={styles.titleRow}>
        <AppText variant="display">Profile</AppText>
        <LogoMark size="sm" />
      </View>

      <Card elevated="md" style={{ marginBottom: 16 }}>
        <View style={styles.userRow}>
          <Avatar name={user?.name} seed={user?.id} size={56} avatarUrl={user?.avatar_url} />
          <View style={{ flex: 1 }}>
            <AppText variant="titleSm">{user?.name}</AppText>
            <AppText muted variant="bodySm" style={{ marginTop: 2 }}>
              {user?.email}
            </AppText>
          </View>
        </View>
        <Button
          title="Edit profile"
          variant="secondary"
          style={{ marginTop: 14 }}
          onPress={() => router.push('/profile/edit')}
        />
      </Card>

      <AppText variant="titleSm" style={styles.section}>
        Expenses
      </AppText>
      <Card elevated="sm" style={{ marginBottom: 16, gap: 10 }}>
        <AppText muted variant="bodySm">
          Review expenses that still need a category or other quick updates.
        </AppText>
        <Button
          title="Review expenses"
          variant="secondary"
          onPress={() => router.push('/expenses/review')}
        />
      </Card>

      <AppText variant="titleSm" style={styles.section}>
        Theme
      </AppText>
      <Card elevated="sm" style={{ marginBottom: 16 }}>
        <View style={styles.swatches}>
          {THEME_LIST.map((theme) => {
            const active = theme.id === themeId;
            return (
              <Pressable
                key={theme.id}
                onPress={() => {
                  void Haptics.selectionAsync().catch(() => undefined);
                  void setTheme(theme.id);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${theme.label} theme`}
                accessibilityState={{ selected: active }}
                style={[
                  styles.swatchOuter,
                  active
                    ? {
                        borderColor: theme.swatch,
                        transform: [{ scale: 1.08 }],
                      }
                    : { borderColor: 'transparent', opacity: 0.75 },
                ]}
              >
                <View style={styles.swatchSplit}>
                  <View style={[styles.swatchHalf, { backgroundColor: theme.swatch }]} />
                  <View style={[styles.swatchHalf, { backgroundColor: theme.swatchB }]} />
                </View>
                {active ? <View style={styles.swatchDot} /> : null}
              </Pressable>
            );
          })}
        </View>
        <AppText muted variant="caption" style={{ marginTop: 10 }}>
          {THEME_LIST.find((x) => x.id === themeId)?.label} theme
        </AppText>
      </Card>

      {IS_DEV || APP_ENV !== 'production' ? (
        <>
          <AppText variant="titleSm" style={styles.section}>
            Connection
          </AppText>
          <Card elevated="sm" style={{ marginBottom: 16, gap: 6 }}>
            <AppText muted variant="caption">
              Environment: {APP_ENV}
            </AppText>
            <AppText muted variant="caption">
              {apiUrlHint()}
            </AppText>
          </Card>
        </>
      ) : null}

      <Button title="Log out" variant="danger" loading={busy} onPress={onLogout} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  section: { marginBottom: 10 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  swatches: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', alignItems: 'center' },
  swatchOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  swatchSplit: {
    width: 22,
    height: 22,
    borderRadius: 11,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  swatchHalf: { width: '50%', height: '100%' },
  swatchDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
});
