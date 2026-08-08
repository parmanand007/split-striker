import { TextStyle } from 'react-native';
import { type } from './tokens';

/** Inter font families loaded in app/_layout.tsx */
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
} as const;

export type TextVariant =
  | 'display'
  | 'title'
  | 'titleSm'
  | 'body'
  | 'bodySm'
  | 'caption'
  | 'overline'
  | 'money';

const variantFont: Record<TextVariant, string> = {
  display: fonts.extrabold,
  title: fonts.bold,
  titleSm: fonts.bold,
  body: fonts.regular,
  bodySm: fonts.regular,
  caption: fonts.medium,
  overline: fonts.bold,
  money: fonts.bold,
};

export function textStyle(variant: TextVariant, extra?: TextStyle): TextStyle {
  return {
    fontFamily: variantFont[variant],
    ...type[variant],
    ...(variant === 'overline' ? { textTransform: 'uppercase' as const } : null),
    ...extra,
  };
}
