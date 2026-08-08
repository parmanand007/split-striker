import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { DEFAULT_THEME, THEMES, ThemeId, ThemeTokens } from '@/src/theme/themes';

const THEME_KEY = 'split_striker_theme';

interface ThemeState {
  themeId: ThemeId;
  tokens: ThemeTokens;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setTheme: (id: ThemeId) => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  themeId: DEFAULT_THEME,
  tokens: THEMES[DEFAULT_THEME],
  hydrated: false,
  hydrate: async () => {
    try {
      const saved = await SecureStore.getItemAsync(THEME_KEY);
      const id = (saved && saved in THEMES ? saved : DEFAULT_THEME) as ThemeId;
      set({ themeId: id, tokens: THEMES[id], hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
  setTheme: async (id) => {
    if (!(id in THEMES)) return;
    await SecureStore.setItemAsync(THEME_KEY, id);
    set({ themeId: id, tokens: THEMES[id] });
  },
}));
