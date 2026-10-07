import { afterEach, describe, expect, it, vi } from 'vitest';

import { ThemeId, type Theme } from '@/types/theme';
import { applyThemeColors, getOsPreferredTheme } from '@/utils/apply-theme-colors';

const mockPrefersDark = (matches: boolean) => {
  window.matchMedia = vi.fn().mockReturnValue({ matches }) as unknown as typeof window.matchMedia;
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('applyThemeColors', () => {
  it('sets every theme color as a CSS custom property', () => {
    const el = document.createElement('div');
    const theme: Theme = {
      id: 'dark',
      displayName: 'Dark',
      'app-logo': '',
      colors: { 'bg-layer-0': '#000', 'text-primary': '#fff' },
    };

    applyThemeColors(el, theme);

    expect(el.style.getPropertyValue('--bg-layer-0')).toBe('#000');
    expect(el.style.getPropertyValue('--text-primary')).toBe('#fff');
  });
});

describe('getOsPreferredTheme', () => {
  it.each([
    [true, ThemeId.Dark],
    [false, ThemeId.Light],
  ])('returns %s → %s from prefers-color-scheme', (prefersDark, expected) => {
    mockPrefersDark(prefersDark);

    expect(getOsPreferredTheme()).toBe(expected);
    expect(window.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
  });
});
