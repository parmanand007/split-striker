import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { useThemeStore } from '@/src/stores/themeStore';
import { MARKETING } from '@/src/theme/themes';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  /** Dark auth inputs matching web UserSelectPage. */
  dark?: boolean;
}

export function TextField({ label, error, style, dark, ...rest }: Props) {
  const t = useThemeStore((s) => s.tokens);

  const bg = dark ? MARKETING.inputBg : t.inputBg;
  const border = error
    ? dark
      ? MARKETING.negative
      : t.danger
    : dark
      ? MARKETING.inputBorder
      : t.cardBorder;
  const color = dark ? MARKETING.text : t.text;
  const labelColor = dark ? MARKETING.textMuted : t.textMuted;
  const placeholder = dark ? MARKETING.textDim : t.textMuted;

  return (
    <View style={styles.wrap}>
      {label ? <Text style={[styles.label, { color: labelColor }]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={placeholder}
        accessibilityLabel={label || rest.accessibilityLabel}
        accessibilityState={{
          disabled: rest.editable === false,
          ...(error ? { invalid: true } : {}),
        }}
        style={[
          styles.input,
          {
            backgroundColor: bg,
            borderColor: border,
            color,
            borderRadius: dark ? 16 : t.radiusSm, // web .input rounded-xl; auth rounded-2xl
          },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <Text
          style={[styles.error, { color: dark ? MARKETING.negative : t.danger }]}
          accessibilityRole="alert"
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 12, fontWeight: '600' },
  input: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16, // web iOS zoom fix
    minHeight: 52,
  },
  error: { fontSize: 12, fontWeight: '500' },
});
