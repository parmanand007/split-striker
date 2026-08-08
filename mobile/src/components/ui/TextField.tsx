import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { useThemeStore } from '@/src/stores/themeStore';
import { MARKETING } from '@/src/theme/themes';
import { fonts } from '@/src/theme/typography';
import { AppText } from './AppText';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  /** Dark auth inputs matching web UserSelectPage. */
  dark?: boolean;
  /** Flat row inside a grouped card — no box border. */
  grouped?: boolean;
}

export function TextField({ label, error, style, dark, grouped, ...rest }: Props) {
  const t = useThemeStore((s) => s.tokens);

  const bg = dark ? MARKETING.inputBg : grouped ? 'transparent' : t.inputBg;
  const border = error
    ? dark
      ? MARKETING.negative
      : t.danger
    : grouped
      ? 'transparent'
      : dark
        ? MARKETING.inputBorder
        : t.cardBorder;
  const color = dark ? MARKETING.text : t.text;
  const labelColor = dark ? MARKETING.textMuted : t.textMuted;
  const placeholder = dark ? MARKETING.textDim : t.textMuted;

  return (
    <View style={styles.wrap}>
      {label ? (
        <AppText variant="caption" style={{ color: labelColor, fontFamily: fonts.semibold }}>
          {label}
        </AppText>
      ) : null}
      <TextInput
        placeholderTextColor={placeholder}
        accessibilityLabel={label || rest.accessibilityLabel}
        accessibilityState={{
          disabled: rest.editable === false,
          ...(error ? { invalid: true } : {}),
        }}
        style={[
          styles.input,
          grouped ? styles.inputGrouped : null,
          {
            backgroundColor: bg,
            borderColor: border,
            color,
            borderRadius: grouped ? 0 : dark ? 16 : t.radiusMd,
            fontFamily: fonts.regular,
            ...(dark || grouped
              ? null
              : {
                  shadowColor: '#0f172a',
                  shadowOpacity: 0.03,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 1 },
                }),
          },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <AppText
          variant="caption"
          style={{ color: dark ? MARKETING.negative : t.danger }}
          accessibilityRole="alert"
        >
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  input: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    minHeight: 52,
  },
  inputGrouped: {
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 10,
    minHeight: 44,
    fontSize: 17,
  },
});
