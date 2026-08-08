import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuthStore } from '@/src/stores/authStore';
import { useThemeStore } from '@/src/stores/themeStore';
import { THEME_LIST } from '@/src/theme/themes';
import { Screen } from '@/src/components/ui/Screen';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { APP_ENV, IS_DEV, apiUrlHint } from '@/src/config/env';
import { useAuthActions } from '@/src/features/auth/useAuthActions';

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const { themeId, tokens: t, setTheme } = useThemeStore();
  const { busy, signOut } = useAuthActions();

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
    <Screen scroll>
      <Text style={[styles.title, { color: t.text }]}>Profile</Text>

      <Card style={{ marginBottom: 16 }}>
        <View style={styles.userRow}>
          <View style={[styles.avatar, { backgroundColor: t.brand500 }]}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 20 }}>
              {(user?.name || '?').slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.text, fontWeight: '800', fontSize: 18 }}>{user?.name}</Text>
            <Text style={{ color: t.textMuted }}>{user?.email}</Text>
          </View>
        </View>
      </Card>

      <Text style={[styles.section, { color: t.text }]}>Theme</Text>
      <Card style={{ marginBottom: 16 }}>
        <View style={styles.swatches}>
          {THEME_LIST.map((theme) => {
            const active = theme.id === themeId;
            return (
              <Pressable
                key={theme.id}
                onPress={() => void setTheme(theme.id)}
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
                {/* Approximate web conic-gradient(swatch | swatchB) */}
                <View style={styles.swatchSplit}>
                  <View style={[styles.swatchHalf, { backgroundColor: theme.swatch }]} />
                  <View style={[styles.swatchHalf, { backgroundColor: theme.swatchB }]} />
                </View>
                {active ? <View style={styles.swatchDot} /> : null}
              </Pressable>
            );
          })}
        </View>
        <Text style={{ color: t.textMuted, marginTop: 10 }}>
          {THEME_LIST.find((x) => x.id === themeId)?.label} theme
        </Text>
      </Card>

      {IS_DEV || APP_ENV !== 'production' ? (
        <>
          <Text style={[styles.section, { color: t.text }]}>Connection</Text>
          <Card style={{ marginBottom: 16, gap: 6 }}>
            <Text style={{ color: t.textMuted }}>Environment: {APP_ENV}</Text>
            <Text style={{ color: t.textMuted }}>{apiUrlHint()}</Text>
          </Card>
        </>
      ) : null}

      <Button title="Log out" variant="danger" loading={busy} onPress={onLogout} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', marginBottom: 16 },
  section: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
