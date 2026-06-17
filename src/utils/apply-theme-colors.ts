import { ThemeId } from '@/types/theme';
import type { Theme } from '@/types/theme';

export const applyThemeColors = (el: HTMLElement, theme: Theme): void => {
  Object.entries(theme.colors).forEach(([key, value]) => {
    el.style.setProperty(`--${key}`, value);
  });
};

export const getOsPreferredTheme = (): string =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? ThemeId.Dark : ThemeId.Light;
