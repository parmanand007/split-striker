import { useCallback, useEffect, useState } from 'react';
import { Alert, ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { updateUser } from '@/src/api/users';
import { deleteUserAvatar, uploadUserAvatar } from '@/src/api/avatar';
import {
  pickProfilePhotoFromLibrary,
  showProfilePhotoOptions,
  takeProfilePhoto,
} from '@/src/features/profile/pickProfilePhoto';
import { useAuthStore } from '@/src/stores/authStore';
import { useThemeStore } from '@/src/stores/themeStore';
import { Screen } from '@/src/components/ui/Screen';
import { Card } from '@/src/components/ui/Card';
import { TextField } from '@/src/components/ui/TextField';
import { AppText } from '@/src/components/ui/AppText';
import { Avatar } from '@/src/components/ui/Avatar';
import { ApiError } from '@/src/types/api';
import { fonts } from '@/src/theme/typography';
import { space } from '@/src/theme/tokens';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Enter a valid email'),
});

type FormValues = z.infer<typeof schema>;

export default function EditProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const t = useThemeStore((s) => s.tokens);
  const router = useRouter();
  const [avatarBusy, setAvatarBusy] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '' },
  });

  useEffect(() => {
    if (user) {
      reset({ name: user.name, email: user.email || '' });
    }
  }, [user, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      updateUser(user!.id, {
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
      }),
    onSuccess: (fresh) => {
      setUser(fresh);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
      Alert.alert('Profile updated', 'Your changes have been saved.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (e) => {
      Alert.alert(
        'Could not update profile',
        e instanceof ApiError ? e.detail : String(e),
      );
    },
  });

  const onSave = useCallback(
    (values: FormValues) => mutation.mutate(values),
    [mutation],
  );

  const applyAvatar = async (uri: string) => {
    if (!user) return;
    setAvatarBusy(true);
    try {
      const fresh = await uploadUserAvatar(user.id, uri);
      setUser(fresh);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
    } catch (e) {
      Alert.alert(
        'Upload failed',
        e instanceof ApiError ? e.detail : e instanceof Error ? e.message : String(e),
      );
    } finally {
      setAvatarBusy(false);
    }
  };

  const pickFromLibrary = async () => {
    try {
      const uri = await pickProfilePhotoFromLibrary();
      if (uri) await applyAvatar(uri);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes('permission denied')) {
        Alert.alert('Could not open library', msg);
      }
    }
  };

  const takePhoto = async () => {
    try {
      const uri = await takeProfilePhoto();
      if (uri) await applyAvatar(uri);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes('permission denied')) {
        Alert.alert('Could not open camera', msg);
      }
    }
  };

  const onChangePhoto = () => {
    showProfilePhotoOptions({
      hasAvatar: !!user?.avatar_url,
      onLibrary: () => void pickFromLibrary(),
      onCamera: () => void takePhoto(),
      onRemove: user?.avatar_url
        ? () => {
            Alert.alert('Remove photo', 'Go back to your initials avatar?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Remove', style: 'destructive', onPress: () => void removeAvatar() },
            ]);
          }
        : undefined,
    });
  };

  const removeAvatar = async () => {
    if (!user) return;
    setAvatarBusy(true);
    try {
      const fresh = await deleteUserAvatar(user.id);
      setUser(fresh);
    } catch (e) {
      Alert.alert(
        'Could not remove photo',
        e instanceof ApiError ? e.detail : String(e),
      );
    } finally {
      setAvatarBusy(false);
    }
  };

  if (!user) return null;

  const canSave = isDirty && !mutation.isPending;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Edit profile',
          headerShown: true,
          headerTintColor: t.brand500,
          headerStyle: { backgroundColor: t.pageBg },
          headerShadowVisible: false,
          headerRight: () => (
            <Pressable
              onPress={canSave ? handleSubmit(onSave) : undefined}
              disabled={!canSave}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Save profile"
              accessibilityState={{ disabled: !canSave }}
              style={({ pressed }) => [{ opacity: pressed && canSave ? 0.7 : 1 }]}
            >
              {mutation.isPending ? (
                <ActivityIndicator size="small" color={t.brand500} />
              ) : (
                <AppText
                  variant="body"
                  style={{
                    color: canSave ? t.brand500 : t.textMuted,
                    fontFamily: fonts.bold,
                  }}
                >
                  Save
                </AppText>
              )}
            </Pressable>
          ),
        }}
      />
      <Screen withHeader scroll keyboard>
        <View style={styles.hero}>
          <View style={[styles.avatarHalo, { backgroundColor: t.brand100 }]} />
          <Pressable
            onPress={avatarBusy ? undefined : onChangePhoto}
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
            style={({ pressed }) => [
              styles.avatarWrap,
              { transform: [{ scale: pressed && !avatarBusy ? 0.98 : 1 }] },
            ]}
          >
            <Avatar
              name={user.name}
              seed={user.id}
              size={112}
              shape="circle"
              avatarUrl={user.avatar_url}
            />
            <View
              style={[
                styles.cameraBadge,
                { backgroundColor: t.brand500, borderColor: t.pageBg },
              ]}
            >
              {avatarBusy ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="camera" size={15} color="#fff" />
              )}
            </View>
          </Pressable>

          <AppText variant="titleSm" style={styles.displayName}>
            {user.name}
          </AppText>
          <AppText muted variant="bodySm">
            {user.email}
          </AppText>

          <Pressable
            onPress={avatarBusy ? undefined : onChangePhoto}
            disabled={avatarBusy}
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
            style={({ pressed }) => [
              styles.changePhotoBtn,
              {
                backgroundColor: t.brand50,
                borderColor: t.brand100,
                opacity: avatarBusy ? 0.6 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <Ionicons name="image-outline" size={16} color={t.brand600} />
            <AppText
              variant="bodySm"
              style={{ color: t.brand600, fontFamily: fonts.semibold }}
            >
              Change photo
            </AppText>
          </Pressable>
        </View>

        <AppText variant="overline" muted style={styles.sectionLabel}>
          Personal info
        </AppText>

        <Card elevated="sm" padded={false} style={styles.formCard}>
          <View style={styles.fieldBlock}>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  label="Full name"
                  grouped
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  error={errors.name?.message}
                  autoComplete="name"
                  textContentType="name"
                  placeholder="Your name"
                  placeholderTextColor={t.textMuted}
                />
              )}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: t.cardBorder }]} />

          <View style={styles.fieldBlock}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  label="Email"
                  grouped
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  error={errors.email?.message}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  textContentType="emailAddress"
                  placeholder="you@example.com"
                  placeholderTextColor={t.textMuted}
                />
              )}
            />
          </View>
        </Card>

        <AppText muted variant="caption" style={styles.hint}>
          {isDirty
            ? 'You have unsaved changes — tap Save in the top right.'
            : 'Your email is used to sign in. No password needed.'}
        </AppText>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingTop: space.sm,
    paddingBottom: space.xxl,
  },
  avatarHalo: {
    position: 'absolute',
    top: 18,
    width: 136,
    height: 136,
    borderRadius: 68,
    opacity: 0.55,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: space.lg,
  },
  cameraBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  displayName: {
    textAlign: 'center',
    marginBottom: 2,
  },
  changePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: space.lg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  sectionLabel: {
    marginBottom: space.sm,
    marginLeft: 2,
    letterSpacing: 1,
  },
  formCard: {
    overflow: 'hidden',
  },
  fieldBlock: {
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: space.lg,
  },
  hint: {
    marginTop: space.lg,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: space.md,
  },
});
