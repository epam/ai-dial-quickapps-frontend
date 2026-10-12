import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import i18n from '@/i18n';
import { setupTestRoot } from '@/test-utils/test-root';

import { I18nProvider } from '../I18nProvider';

let originalLanguage: string;
let originalDirection: string;
let originalDocumentLanguage: string;

beforeEach(() => {
  originalLanguage = i18n.language;
  originalDirection = document.documentElement.dir;
  originalDocumentLanguage = document.documentElement.lang;
});

afterEach(async () => {
  await i18n.changeLanguage(originalLanguage);
  document.documentElement.dir = originalDirection;
  document.documentElement.lang = originalDocumentLanguage;
});

// Set up after the hooks above: after-hooks run in reverse order, so the root
// unmounts before the original language is restored.
const dom = setupTestRoot();

describe('I18nProvider', () => {
  it('sets the document language and direction for the active language', async () => {
    await act(async () => {
      await i18n.changeLanguage('en');
      dom.root.render(
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
      dom.root.render(
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
      dom.root.render(
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
      dom.root.render(
        <I18nProvider>
          <div>Content</div>
        </I18nProvider>,
      );
    });

    dom.render(null);
    document.documentElement.dir = 'ltr';

    await act(async () => {
      await i18n.changeLanguage('ar');
    });

    expect(document.documentElement.dir).toBe('ltr');
  });
});
