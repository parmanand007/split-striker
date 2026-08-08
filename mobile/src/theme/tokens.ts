/**
 * Shared spacing, type, elevation — used with themes.ts color tokens.
 * Keep visual only; no product logic here.
 */
export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export const type = {
  display: { fontSize: 30, lineHeight: 36, letterSpacing: -0.5 },
  title: { fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  titleSm: { fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  body: { fontSize: 15, lineHeight: 22 },
  bodySm: { fontSize: 13, lineHeight: 18 },
  caption: { fontSize: 12, lineHeight: 16 },
  overline: { fontSize: 11, lineHeight: 14, letterSpacing: 0.8 },
  money: { fontSize: 20, lineHeight: 26, letterSpacing: -0.3 },
} as const;

export function shadow(level: 'none' | 'sm' | 'md' | 'lg' | 'glow' = 'sm') {
  switch (level) {
    case 'none':
      return {
        shadowColor: 'transparent',
        shadowOpacity: 0,
        shadowRadius: 0,
        shadowOffset: { width: 0, height: 0 },
        elevation: 0,
      };
    case 'md':
      return {
        shadowColor: '#0f172a',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
      };
    case 'lg':
      return {
        shadowColor: '#0f172a',
        shadowOpacity: 0.12,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
        elevation: 6,
      };
    case 'glow':
      return {
        shadowColor: '#be1240',
        shadowOpacity: 0.28,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 4,
      };
    case 'sm':
    default:
      return {
        shadowColor: '#0f172a',
        shadowOpacity: 0.06,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      };
  }
}

export const motion = {
  pressScale: 0.97,
  fast: 160,
  normal: 240,
  slow: 360,
} as const;
