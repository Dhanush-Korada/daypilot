import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth } from '../config/firebase';
import { getUserSettings, saveUserSettings } from '../services/userService';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  weekStartsOn: number;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => Promise<void>;
  setWeekStartsOn: (day: number) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('daypilot_theme') as Theme | null;
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
    return 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    const saved = localStorage.getItem('daypilot_theme') as Theme | null;
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [weekStartsOn, setWeekStartsOnState] = useState<number>(() => {
    const saved = localStorage.getItem('daypilot_week_start');
    return saved !== null ? parseInt(saved, 10) : 1; // 1 = Monday, 0 = Sunday
  });

  const applyTheme = useCallback((targetTheme: Theme) => {
    const isDark =
      targetTheme === 'dark' ||
      (targetTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      setResolvedTheme('dark');
    } else {
      root.classList.remove('dark');
      setResolvedTheme('light');
    }
  }, []);

  // Listen to system theme changes when theme is 'system'
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    applyTheme(theme);
    localStorage.setItem('daypilot_theme', theme);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [theme, applyTheme]);

  // Load user settings from Firestore when user is logged in
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const settings = await getUserSettings(user.uid);
          if (settings) {
            if (settings.theme && (settings.theme === 'light' || settings.theme === 'dark' || settings.theme === 'system')) {
              setThemeState(settings.theme);
              applyTheme(settings.theme);
              localStorage.setItem('daypilot_theme', settings.theme);
            }
            if (typeof settings.weekStartsOn === 'number') {
              setWeekStartsOnState(settings.weekStartsOn);
              localStorage.setItem('daypilot_week_start', String(settings.weekStartsOn));
            }
          }
        } catch (err) {
          console.warn('Could not load user settings for theme:', err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('daypilot_theme', newTheme);
    applyTheme(newTheme);

    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        await saveUserSettings(currentUser.uid, { theme: newTheme });
      } catch (err) {
        console.error('Failed to save theme in Firestore:', err);
      }
    }
  };

  const setWeekStartsOn = async (day: number) => {
    setWeekStartsOnState(day);
    localStorage.setItem('daypilot_week_start', String(day));

    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        await saveUserSettings(currentUser.uid, { weekStartsOn: day });
      } catch (err) {
        console.error('Failed to save weekStartsOn in Firestore:', err);
      }
    }
  };

  const toggleTheme = () => {
    // If currently dark, switch to light; if light or system-light, switch to dark
    const next = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        weekStartsOn,
        toggleTheme,
        setTheme,
        setWeekStartsOn,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
