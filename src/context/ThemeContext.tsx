'use client';
import {
  createContext,
  FC,
  memo,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { Theme, ThemeConfiguration } from '@/types/theme';
import { ThemeId } from '@/types/theme';
import { applyThemeColors, getOsPreferredTheme } from '@/utils/apply-theme-colors';

const THEMES_URL = '/api/themes';
const STORAGE_KEY = 'dial-theme';

const getQueryTheme = (): string | null => new URLSearchParams(window.location.search).get('theme');

interface ThemeContextValue {
  themes: Theme[];
  selectedThemeId: string;
  currentTheme: Theme | undefined;
  isLoading: boolean;
  setTheme: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
}

const ThemeProvider: FC<ThemeProviderProps> = ({ children }) => {
  const [config, setConfig] = useState<ThemeConfiguration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // User-chosen theme persisted to localStorage (fallback when no query param)
  const [selectedThemeId, setSelectedThemeId] = useState<string>(() => {
    if (typeof window === 'undefined') return ThemeId.Light;
    return localStorage.getItem(STORAGE_KEY) ?? ThemeId.Light;
  });
  // Theme from ?theme= query param — takes precedence over selectedThemeId
  const [queryThemeId, setQueryThemeId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return getQueryTheme();
  });
  const [osPreference, setOsPreference] = useState<string>(() => {
    if (typeof window === 'undefined') return ThemeId.Dark;
    return getOsPreferredTheme();
  });

  // Subscribe to OS preference changes and URL changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMq = (e: MediaQueryListEvent) => {
      setOsPreference(e.matches ? ThemeId.Dark : ThemeId.Light);
    };
    mq.addEventListener('change', handleMq);

    // Re-read query param whenever the URL changes (parent can push a new URL into the iframe)
    const handlePopState = () => setQueryThemeId(getQueryTheme());
    window.addEventListener('popstate', handlePopState);

    return () => {
      mq.removeEventListener('change', handleMq);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Fetch theme configuration
  useEffect(() => {
    fetch(THEMES_URL)
      .then((r) => r.json() as Promise<ThemeConfiguration>)
      .then((data) => {
        if (process.env.NODE_ENV === 'development') {
          console.debug('[ThemeContext] fetched config:', data);
        }
        setConfig(data);
      })
      .catch(() => {
        // silently fall back to CSS-var defaults already in globals.css
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Priority: query param > user choice; system resolves to OS preference
  const activeThemeId = queryThemeId ?? selectedThemeId;
  const resolvedThemeId = activeThemeId === ThemeId.System ? osPreference : activeThemeId;

  const currentTheme = useMemo(() => {
    const themes = config?.themes;
    if (!themes?.length) return undefined;
    return themes.find((t) => t.id === resolvedThemeId) ?? themes[0];
  }, [config, resolvedThemeId]);

  // Apply CSS custom properties to document root whenever the resolved theme changes
  useEffect(() => {
    if (currentTheme) {
      applyThemeColors(document.documentElement, currentTheme);
    }
  }, [currentTheme]);

  const setTheme = useCallback((id: string) => {
    setSelectedThemeId(id);
    setQueryThemeId(null); // explicit choice overrides URL param
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      themes: config?.themes ?? [],
      selectedThemeId: activeThemeId,
      currentTheme,
      isLoading,
      setTheme,
    }),
    [config, activeThemeId, currentTheme, isLoading, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export default memo(ThemeProvider);

export const useThemeContext = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeContext must be used inside ThemeProvider');
  return ctx;
};
