import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import i18n from '@/i18n';

import { I18nProvider } from '../I18nProvider';

let root: Root;
let container: HTMLDivElement;
let originalLanguage: string;
let originalDirection: string;
let originalDocumentLanguage: string;

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  originalLanguage = i18n.language;
  originalDirection = document.documentElement.dir;
  originalDocumentLanguage = document.documentElement.lang;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  act(() => root.unmount());
  await i18n.changeLanguage(originalLanguage);
  document.documentElement.dir = originalDirection;
  document.documentElement.lang = originalDocumentLanguage;
  container.remove();
});

describe('I18nProvider', () => {
  it('sets the document language and direction for the active language', async () => {
    await act(async () => {
      await i18n.changeLanguage('en');
      root.render(
        <I18nProvider>
          <div>Content</div>
        </I18nProvider>,
      );
    });

    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('updates document direction when the language changes to RTL', async () => {
    await act(async () => {
      root.render(
        <I18nProvider>
          <div>Content</div>
        </I18nProvider>,
      );
    });

    await act(async () => {
      await i18n.changeLanguage('ar');
    });

    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
  });

  it('restores LTR direction when changing from RTL to an LTR language', async () => {
    await act(async () => {
      await i18n.changeLanguage('ar');
      root.render(
        <I18nProvider>
          <div>Content</div>
        </I18nProvider>,
      );
    });

    await act(async () => {
      await i18n.changeLanguage('en');
    });

    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('removes the language listener when unmounted', async () => {
    await act(async () => {
      root.render(
        <I18nProvider>
          <div>Content</div>
        </I18nProvider>,
      );
    });

    act(() => root.render(null));
    document.documentElement.dir = 'ltr';

    await act(async () => {
      await i18n.changeLanguage('ar');
    });

    expect(document.documentElement.dir).toBe('ltr');
  });
});
