import { describe, expect, it } from 'vitest';

import { buildLocalizedText, getLocalizedText } from '@/utils/get-localized-text';

describe('getLocalizedText', () => {
  it('returns a non-empty plain string', () => {
    expect(getLocalizedText('Hello', 'fr', 'Fallback')).toBe('Hello');
  });

  it('prefers the requested language', () => {
    expect(getLocalizedText({ en: 'Hello', fr: 'Bonjour' }, 'fr', 'Fallback')).toBe('Bonjour');
  });

  it('falls back to English when the requested language is unavailable', () => {
    expect(getLocalizedText({ en: 'Hello', fr: 'Bonjour' }, 'de', 'Fallback')).toBe('Hello');
  });

  it('falls back to the first non-empty translation', () => {
    expect(getLocalizedText({ en: ' ', fr: '', de: 'Hallo' }, 'es', 'Fallback')).toBe('Hallo');
  });

  it.each([undefined, '', { en: ' ', fr: '' }])(
    'returns the fallback when no usable translation exists: %s',
    (value) => {
      expect(getLocalizedText(value, 'fr', 'Fallback')).toBe('Fallback');
    },
  );
});

describe('buildLocalizedText', () => {
  it('combines the primary value with translations from other locales', () => {
    expect(
      buildLocalizedText(
        'Hello',
        'en',
        [{ language: 'fr', name: 'Bonjour' }, { language: 'de', name: 'Hallo' }],
        'name',
      ),
    ).toEqual({ en: 'Hello', fr: 'Bonjour', de: 'Hallo' });
  });

  it('supports description translations and ignores missing values', () => {
    expect(
      buildLocalizedText(
        'Description',
        'en',
        [{ language: 'fr', description: 'Description française' }, { language: 'de' }],
        'description',
      ),
    ).toEqual({ en: 'Description', fr: 'Description française' });
  });

  it('returns the primary value when no locale dictionary can be built', () => {
    expect(buildLocalizedText('Hello', undefined, undefined, 'name')).toBe('Hello');
    expect(buildLocalizedText(undefined, undefined, undefined, 'description')).toBeUndefined();
  });
});
