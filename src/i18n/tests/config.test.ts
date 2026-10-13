import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Real i18next; only the React binding is stubbed (it needs no React tree here).
vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

const LANGUAGE_STORAGE_KEY = 'i18nextLng';

const loadI18n = async () => {
  vi.resetModules();
  await import('../config');
  const { default: i18n } = await import('i18next');
  return i18n;
};

describe('i18n config — document language', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('lang');
    document.documentElement.removeAttribute('dir');
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('starts in English, left to right', async () => {
    const i18n = await loadI18n();

    expect(i18n.resolvedLanguage).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('sets lang to the rendered fallback language when the detected one has no translation', async () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'uk');

    await loadI18n();

    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('keeps the document LTR when an untranslated RTL language is detected', async () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'ar');

    await loadI18n();

    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('resolves a browser language without resources to English', async () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('fr');
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['fr']);

    const i18n = await loadI18n();

    expect(i18n.resolvedLanguage).toBe('en');
    expect(i18n.t('buttons.cancel')).toBe('Cancel');
  });

  it('updates lang to the resolved language on language change', async () => {
    const i18n = await loadI18n();

    await i18n.changeLanguage('uk');

    expect(document.documentElement.lang).toBe('en');
  });

  it('switches to RTL for a right-to-left language with resources, and back', async () => {
    const i18n = await loadI18n();
    i18n.addResourceBundle('ar', 'translation', { buttons: { cancel: 'إلغاء' } });

    await i18n.changeLanguage('ar');
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');

    await i18n.changeLanguage('en');
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('treats a regional code of a right-to-left language as RTL', async () => {
    const i18n = await loadI18n();
    i18n.addResourceBundle('ar', 'translation', { buttons: { cancel: 'إلغاء' } });

    await i18n.changeLanguage('ar-EG');

    expect(document.documentElement.dir).toBe('rtl');
  });
});
