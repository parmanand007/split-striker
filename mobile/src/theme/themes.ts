/**
 * Design tokens mirrored from frontend/src/index.css + LandingPage / UserSelectPage.
 * Keep in sync with web `data-theme` CSS variables.
 */
export type ThemeId = 'maroon' | 'forest' | 'amber' | 'olive' | 'teal' | 'rust';

export interface ThemeTokens {
  id: ThemeId;
  label: string;
  brand50: string;
  brand100: string;
  brand400: string;
  brand500: string;
  brand600: string;
  brand700: string;
  brand800: string;
  sidebarBg: string;
  pageBg: string;
  cardBg: string;
  cardBorder: string;
  btnPrimaryText: string;
  swatch: string;
  swatchB: string;
  text: string;
  textMuted: string;
  textInverse: string;
  positive: string;
  positiveBg: string;
  negative: string;
  negativeBg: string;
  danger: string;
  inputBg: string;
  tabBar: string;
  overlay: string;
  /** Ambient auth blobs (hex), matching --blob-a/b/c */
  blobA: string;
  blobB: string;
  blobC: string;
  radiusSm: number;
  radiusMd: number;
  radiusLg: number;
  radiusXl: number;
}

/** Slate neutrals from Tailwind / web body text */
const base = {
  text: '#0f172a', // slate-900
  textMuted: '#64748b', // slate-500
  textInverse: '#ffffff',
  positive: '#059669', // positive-600
  positiveBg: '#ecfdf5', // positive-50
  negative: '#e11d48', // negative-600
  negativeBg: '#fff1f2', // negative-50
  danger: '#e11d48',
  inputBg: '#ffffff',
  overlay: 'rgba(0,0,0,0.50)',
  btnPrimaryText: '#000000',
  radiusSm: 12, // xl
  radiusMd: 16, // 2xl — cards / buttons
  radiusLg: 20,
  radiusXl: 24, // 3xl — auth cards
};

export const THEMES: Record<ThemeId, ThemeTokens> = {
  maroon: {
    id: 'maroon',
    label: 'Maroon',
    brand50: '#fff1f2',
    brand100: '#fedce0',
    brand400: '#e63c50',
    brand500: '#be1240',
    brand600: '#9f0e30',
    brand700: '#800c26',
    brand800: '#680a1e',
    sidebarBg: '#2c0810',
    pageBg: '#fafafa',
    cardBg: '#ffffff',
    cardBorder: '#f0d4d8',
    swatch: '#be1240',
    swatchB: '#f6f1f2',
    tabBar: '#ffffff',
    blobA: '#dc263c',
    blobB: '#fb923c',
    blobC: '#f59e0b',
    ...base,
  },
  forest: {
    id: 'forest',
    label: 'Forest',
    brand50: '#f0fdf4',
    brand100: '#dcfce7',
    brand400: '#32b45a',
    brand500: '#15803d',
    brand600: '#126c34',
    brand700: '#0e582a',
    brand800: '#0c4822',
    sidebarBg: '#0a2e12',
    pageBg: '#f8fbf8',
    cardBg: '#ffffff',
    cardBorder: '#c8e6d0',
    swatch: '#15803d',
    swatchB: '#f0f5f1',
    tabBar: '#ffffff',
    blobA: '#22c55e',
    blobB: '#84cc16',
    blobC: '#10b981',
    ...base,
  },
  amber: {
    id: 'amber',
    label: 'Amber',
    brand50: '#fffbeb',
    brand100: '#fef3c7',
    brand400: '#eb9b14',
    brand500: '#d97706',
    brand600: '#b46004',
    brand700: '#924a04',
    brand800: '#783c04',
    sidebarBg: '#3d2505',
    pageBg: '#fffbf5',
    cardBg: '#ffffff',
    cardBorder: '#fde68a',
    swatch: '#d97706',
    swatchB: '#fdf8ee',
    tabBar: '#ffffff',
    blobA: '#f59e0b',
    blobB: '#fbbf24',
    blobC: '#ea580c',
    ...base,
  },
  olive: {
    id: 'olive',
    label: 'Olive',
    brand50: '#f7fee7',
    brand100: '#ecfccb',
    brand400: '#82c31e',
    brand500: '#65a30d',
    brand600: '#54880a',
    brand700: '#446e08',
    brand800: '#375a06',
    sidebarBg: '#1c2805',
    pageBg: '#f8fbf4',
    cardBg: '#ffffff',
    cardBorder: '#d4e8b4',
    swatch: '#65a30d',
    swatchB: '#f4f6ee',
    tabBar: '#ffffff',
    blobA: '#84cc16',
    blobB: '#22c55e',
    blobC: '#f59e0b',
    ...base,
  },
  teal: {
    id: 'teal',
    label: 'Teal',
    brand50: '#f0fdfa',
    brand100: '#ccfbf1',
    brand400: '#1cbeac',
    brand500: '#0d9488',
    brand600: '#0b7c72',
    brand700: '#09645c',
    brand800: '#084e48',
    sidebarBg: '#062820',
    pageBg: '#f4fbfa',
    cardBg: '#ffffff',
    cardBorder: '#b2e0da',
    swatch: '#0d9488',
    swatchB: '#eef6f5',
    tabBar: '#ffffff',
    blobA: '#14b8a6',
    blobB: '#22c55e',
    blobC: '#84cc16',
    ...base,
  },
  rust: {
    id: 'rust',
    label: 'Rust',
    brand50: '#fff7ed',
    brand100: '#ffe7cc',
    brand400: '#e66423',
    brand500: '#c2410c',
    brand600: '#a0340a',
    brand700: '#822a08',
    brand800: '#682206',
    sidebarBg: '#3d1a06',
    pageBg: '#fbf6f2',
    cardBg: '#ffffff',
    cardBorder: '#f5d0b4',
    swatch: '#c2410c',
    swatchB: '#f8f0ea',
    tabBar: '#ffffff',
    blobA: '#ea580c',
    blobB: '#dc263c',
    blobC: '#f59e0b',
    ...base,
  },
};

export const THEME_LIST = Object.values(THEMES);
export const DEFAULT_THEME: ThemeId = 'maroon';

/**
 * Marketing / welcome / auth dark palette — matches LandingPage + UserSelectPage
 * (fixed maroon dark canvas, not theme-switched).
 */
export const MARKETING = {
  bg: '#080d14',
  bgMid: '#0e1825',
  card: 'rgba(255,255,255,0.07)',
  cardSolid: '#111827',
  cardBorder: 'rgba(255,255,255,0.10)',
  text: '#ffffff',
  textMuted: '#94a3b8', // slate-400
  textDim: '#64748b', // slate-500
  accent: '#be1240', // brand-500
  accentSoft: '#e63358',
  accentBright: '#ff7a6e',
  accentDeep: '#7f0e26',
  brand600: '#9f0e30',
  brand800: '#680a1e',
  success: '#10b981',
  inputBg: 'rgba(0,0,0,0.35)',
  inputBorder: 'rgba(255,255,255,0.15)',
  negative: '#fb7185', // negative-400
};
