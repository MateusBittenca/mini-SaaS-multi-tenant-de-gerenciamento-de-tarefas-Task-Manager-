import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

function readStoredTheme(): Theme {
  try {
    const raw = localStorage.getItem('trama-theme');
    if (!raw) return 'light';
    const parsed = JSON.parse(raw) as { state?: { theme?: Theme } };
    return parsed.state?.theme === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

applyTheme(readStoredTheme());

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: readStoredTheme(),
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light';
        get().setTheme(next);
      },
    }),
    {
      name: 'trama-theme',
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme);
      },
    }
  )
);
