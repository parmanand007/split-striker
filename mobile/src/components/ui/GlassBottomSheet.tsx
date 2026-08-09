import { ReactNode } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '@/src/stores/themeStore';
import { AppText } from './AppText';
import { shadow } from '@/src/theme/tokens';

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Cap sheet content height (e.g. long lists). Sheet still hugs content below this. */
  maxHeight?: number;
}

/**
 * Shared iOS-style glass bottom sheet: blurred backdrop, grab handle, rounded
 * top corners. Used for currency / category / date pickers so every sheet in
 * the app shares one presentation.
 */
export function GlassBottomSheet({ visible, onClose, title, children, maxHeight }: Props) {
  const t = useThemeStore((s) => s.tokens);
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close">
        {Platform.OS === 'ios' ? (
          <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.androidBackdrop]} />
        )}
      </Pressable>
      <View
        style={[
          styles.sheet,
          shadow('lg'),
          {
            backgroundColor: t.cardBg,
            paddingBottom: Math.max(insets.bottom, 16),
            maxHeight: maxHeight,
          },
        ]}
      >
        <View style={styles.handleRow}>
          <View style={[styles.handle, { backgroundColor: t.cardBorder }]} />
        </View>
        {title ? (
          <AppText variant="titleSm" style={styles.title}>
            {title}
          </AppText>
        ) : null}
        {children}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  androidBackdrop: { backgroundColor: 'rgba(15,23,42,0.45)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  handleRow: { alignItems: 'center', marginBottom: 8 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  title: { marginBottom: 12 },
});
