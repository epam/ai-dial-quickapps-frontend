import { act, FC } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Theme, ThemeConfiguration } from '@/types/theme';

import ThemeProvider, { useThemeContext } from '../ThemeContext';

const { chatApiFetchMock } = vi.hoisted(() => ({ chatApiFetchMock: vi.fn() }));

vi.mock('@/utils/chat-api-fetch', () => ({ chatApiFetch: chatApiFetchMock }));

type ThemeContextValue = ReturnType<typeof useThemeContext>;

const LIGHT: Theme = {
  id: 'light',
  displayName: 'Light',
  'app-logo': 'logo-light.svg',
  colors: { 'bg-layer-base': '#F5F7FA', 'text-primary': '#141A23' },
};

const DARK: Theme = {
  id: 'dark',
  displayName: 'Dark',
  'app-logo': 'logo-dark.svg',
  colors: { 'bg-layer-base': '#0E1117', 'text-primary': '#F3F4F6' },
};

const CONFIG: ThemeConfiguration = {
  themes: [LIGHT, DARK],
  images: {
    'default-addon': 'default-addon.svg',
    'default-model': 'default-model.svg',
    favicon: 'favicon.png',
  },
};

const jsonResponse = (body: unknown, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }) as unknown as Response;

let root: Root;
let container: HTMLDivElement;
let latest: ThemeContextValue | undefined;
let osPrefersDark: boolean;
let mqListeners: Set<(e: MediaQueryListEvent) => void>;

const Consumer: FC = () => {
  latest = useThemeContext();
  return null;
};

const ctx = (): ThemeContextValue => {
  if (!latest) throw new Error('ThemeContext consumer has not rendered');
  return latest;
};

const renderProvider = async () => {
  await act(async () => {
    root.render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    );
  });
};

const changeOsPreference = (isDark: boolean) => {
  osPrefersDark = isDark;
  act(() => {
    mqListeners.forEach((listener) => listener({ matches: isDark } as MediaQueryListEvent));
  });
};

const cssVar = (name: string): string =>
  document.documentElement.style.getPropertyValue(`--${name}`);

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  latest = undefined;
  osPrefersDark = false;
  mqListeners = new Set();
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    get matches() {
      return osPrefersDark;
    },
    media: query,
    addEventListener: (_type: string, listener: (e: MediaQueryListEvent) => void) =>
      mqListeners.add(listener),
    removeEventListener: (_type: string, listener: (e: MediaQueryListEvent) => void) =>
      mqListeners.delete(listener),
  })) as unknown as typeof window.matchMedia;
  chatApiFetchMock.mockReset();
  chatApiFetchMock.mockResolvedValue(jsonResponse(CONFIG));
  localStorage.clear();
  window.history.replaceState(null, '', '/');
  document.documentElement.removeAttribute('style');
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
  document.documentElement.removeAttribute('style');
});

describe('ThemeProvider', () => {
  describe('loading the theme configuration', () => {
    it('requests /api/themes once and reports loading until the response is parsed', async () => {
      let resolveFetch: (res: Response) => void = () => undefined;
      chatApiFetchMock.mockReturnValue(
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
      );

      await renderProvider();

      expect(ctx().isLoading).toBe(true);
      expect(ctx().themes).toEqual([]);

      await act(async () => {
        resolveFetch(jsonResponse(CONFIG));
      });

      expect(chatApiFetchMock).toHaveBeenCalledTimes(1);
      expect(chatApiFetchMock).toHaveBeenCalledWith('/api/themes');
      expect(ctx().isLoading).toBe(false);
      expect(ctx().themes).toEqual(CONFIG.themes);
    });

    it('does not request the configuration again on re-render', async () => {
      await renderProvider();
      await renderProvider();

      expect(chatApiFetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('fallback without a configuration', () => {
    it('writes no custom property and exposes no theme when the request rejects', async () => {
      chatApiFetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

      await renderProvider();

      expect(ctx().isLoading).toBe(false);
      expect(ctx().themes).toEqual([]);
      expect(ctx().currentTheme).toBeUndefined();
      expect(document.documentElement.style.length).toBe(0);
      expect(container.textContent).toBe('');
    });

    it('writes no custom property when the body is not JSON', async () => {
      chatApiFetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.reject(new SyntaxError('Unexpected token <')),
      } as unknown as Response);

      await renderProvider();

      expect(ctx().isLoading).toBe(false);
      expect(ctx().themes).toEqual([]);
      expect(ctx().currentTheme).toBeUndefined();
      expect(document.documentElement.style.length).toBe(0);
    });

    it('does not keep an error-status body as the configuration', async () => {
      chatApiFetchMock.mockResolvedValue(jsonResponse({ ...CONFIG, error: 'unavailable' }, 503));

      await renderProvider();

      expect(ctx().isLoading).toBe(false);
      expect(ctx().themes).toEqual([]);
      expect(ctx().currentTheme).toBeUndefined();
      expect(document.documentElement.style.length).toBe(0);
    });

    it('discards a response that arrives after the provider unmounts', async () => {
      let resolveFetch: (res: Response) => void = () => undefined;
      chatApiFetchMock.mockReturnValue(
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
      );
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      await renderProvider();

      act(() => root.unmount());
      await act(async () => {
        resolveFetch(jsonResponse(CONFIG));
      });

      expect(document.documentElement.style.length).toBe(0);
      expect(consoleError).not.toHaveBeenCalled();
      consoleError.mockRestore();
      root = createRoot(container);
    });

    it('exposes no current theme when the configuration has an empty themes array', async () => {
      chatApiFetchMock.mockResolvedValue(jsonResponse({ ...CONFIG, themes: [] }));

      await renderProvider();

      expect(ctx().currentTheme).toBeUndefined();
      expect(document.documentElement.style.length).toBe(0);
    });

    it('exposes no current theme when the configuration has no themes field', async () => {
      chatApiFetchMock.mockResolvedValue(jsonResponse({ images: CONFIG.images }));

      await renderProvider();

      expect(ctx().themes).toEqual([]);
      expect(ctx().currentTheme).toBeUndefined();
      expect(document.documentElement.style.length).toBe(0);
    });
  });

  describe('choosing the active theme id', () => {
    it('prefers the theme query parameter over the stored choice', async () => {
      localStorage.setItem('dial-theme', 'light');
      window.history.replaceState(null, '', '/?theme=dark');

      await renderProvider();

      expect(ctx().selectedThemeId).toBe('dark');
      expect(ctx().currentTheme).toEqual(DARK);
    });

    it('uses the stored choice when the URL has no theme parameter', async () => {
      localStorage.setItem('dial-theme', 'dark');

      await renderProvider();

      expect(ctx().selectedThemeId).toBe('dark');
      expect(ctx().currentTheme).toEqual(DARK);
    });

    it('defaults to light when neither the URL nor storage has a theme', async () => {
      await renderProvider();

      expect(ctx().selectedThemeId).toBe('light');
      expect(ctx().currentTheme).toEqual(LIGHT);
    });
  });

  describe('system theme', () => {
    it('resolves system to dark when the OS prefers a dark colour scheme', async () => {
      osPrefersDark = true;
      localStorage.setItem('dial-theme', 'system');

      await renderProvider();

      expect(ctx().selectedThemeId).toBe('system');
      expect(ctx().currentTheme).toEqual(DARK);
      expect(cssVar('bg-layer-base')).toBe('#0E1117');
    });

    it('switches to light without a reload when the OS preference changes', async () => {
      osPrefersDark = true;
      localStorage.setItem('dial-theme', 'system');
      await renderProvider();

      changeOsPreference(false);

      expect(ctx().selectedThemeId).toBe('system');
      expect(ctx().currentTheme).toEqual(LIGHT);
      expect(cssVar('bg-layer-base')).toBe('#F5F7FA');
    });

    it('stops listening to the OS preference on unmount', async () => {
      await renderProvider();
      expect(mqListeners.size).toBe(1);

      act(() => root.unmount());
      root = createRoot(container);

      expect(mqListeners.size).toBe(0);
    });
  });

  describe('history navigation', () => {
    it('re-reads the theme query parameter on popstate', async () => {
      window.history.replaceState(null, '', '/?theme=light');
      await renderProvider();
      expect(ctx().selectedThemeId).toBe('light');

      act(() => {
        window.history.replaceState(null, '', '/?theme=dark');
        window.dispatchEvent(new PopStateEvent('popstate'));
      });

      expect(ctx().selectedThemeId).toBe('dark');
      expect(cssVar('bg-layer-base')).toBe('#0E1117');
    });

    it('falls back to the stored choice when popstate removes the theme parameter', async () => {
      localStorage.setItem('dial-theme', 'dark');
      window.history.replaceState(null, '', '/?theme=light');
      await renderProvider();
      expect(ctx().selectedThemeId).toBe('light');

      act(() => {
        window.history.replaceState(null, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
      });

      expect(ctx().selectedThemeId).toBe('dark');
    });

    it('falls back to light when popstate removes the theme parameter and nothing is stored', async () => {
      window.history.replaceState(null, '', '/?theme=dark');
      await renderProvider();
      expect(ctx().selectedThemeId).toBe('dark');

      act(() => {
        window.history.replaceState(null, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
      });

      expect(ctx().selectedThemeId).toBe('light');
    });

    it('ignores URL changes that do not fire popstate', async () => {
      window.history.replaceState(null, '', '/?theme=light');
      await renderProvider();

      act(() => {
        window.history.replaceState(null, '', '/?theme=dark');
      });

      expect(ctx().selectedThemeId).toBe('light');
    });
  });

  describe('applying colours', () => {
    it('writes the resolved theme colours as custom properties on the document root', async () => {
      window.history.replaceState(null, '', '/?theme=dark');

      await renderProvider();

      expect(cssVar('bg-layer-base')).toBe('#0E1117');
      expect(cssVar('text-primary')).toBe('#F3F4F6');
    });

    it('falls back to the first configured theme for an unknown id', async () => {
      window.history.replaceState(null, '', '/?theme=high-contrast');

      await renderProvider();

      expect(ctx().selectedThemeId).toBe('high-contrast');
      expect(ctx().currentTheme).toEqual(LIGHT);
      expect(cssVar('bg-layer-base')).toBe('#F5F7FA');
      expect(cssVar('text-primary')).toBe('#141A23');
    });
  });

  describe('context contract', () => {
    it('throws when useThemeContext is used outside ThemeProvider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const ThrowingConsumer: FC = () => {
        useThemeContext();
        return null;
      };

      expect(() => act(() => root.render(<ThrowingConsumer />))).toThrow(
        'useThemeContext must be used inside ThemeProvider',
      );
      consoleError.mockRestore();
    });

    it('setTheme persists the choice and overrides the URL theme', async () => {
      window.history.replaceState(null, '', '/?theme=light');
      await renderProvider();

      act(() => ctx().setTheme('dark'));

      expect(localStorage.getItem('dial-theme')).toBe('dark');
      expect(window.location.search).toBe('?theme=light');
      expect(ctx().selectedThemeId).toBe('dark');
      expect(ctx().currentTheme).toEqual(DARK);
      expect(cssVar('bg-layer-base')).toBe('#0E1117');
    });

    it('keeps setTheme stable across re-renders', async () => {
      await renderProvider();
      const { setTheme } = ctx();

      act(() => ctx().setTheme('dark'));

      expect(ctx().setTheme).toBe(setTheme);
    });
  });
});
