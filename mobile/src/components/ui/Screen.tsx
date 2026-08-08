import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeStore } from '@/src/stores/themeStore';

type Edge = 'top' | 'right' | 'bottom' | 'left';

interface Props {
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  style?: ViewStyle;
  /** Override safe-area edges. Prefer `withHeader` for stack screens. */
  edges?: Edge[];
  /** Skip top inset when a native stack header is already shown. */
  withHeader?: boolean;
  keyboard?: boolean;
  /** Extra offset for KeyboardAvoidingView under a header. */
  keyboardOffset?: number;
}

export function Screen({
  children,
  scroll,
  refreshing,
  onRefresh,
  style,
  edges,
  withHeader,
  keyboard,
  keyboardOffset,
}: Props) {
  const t = useThemeStore((s) => s.tokens);

  const resolvedEdges: Edge[] =
    edges ??
    (withHeader
      ? ['bottom', 'left', 'right']
      : ['top', 'left', 'right', 'bottom']);

  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.scroll, style]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={t.brand500} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, style]}>{children}</View>
  );

  const content = keyboard ? (
    <KeyboardAvoidingView
      style={styles.fill}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={
        keyboardOffset ?? (withHeader && Platform.OS === 'ios' ? 64 : 0)
      }
    >
      {body}
    </KeyboardAvoidingView>
  ) : (
    body
  );

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: t.pageBg }]} edges={resolvedEdges}>
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 32, flexGrow: 1 },
});
