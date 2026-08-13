import type { LocalizedText } from '@/types/dial-entities';

/**
 * Resolves a `LocalizedText` value (plain string or per-locale dictionary)
 * to a single display string for the given language, falling back to
 * English, then to the first available translation, then to `fallback`.
 */
export const getLocalizedText = (
  value: LocalizedText | undefined,
  language: string,
  fallback: string,
): string => {
  if (typeof value === 'string' && value.trim()) return value;

  if (value && typeof value === 'object') {
    const byLanguage = value[language];
    if (typeof byLanguage === 'string' && byLanguage.trim()) return byLanguage;

    const en = value.en;
    if (typeof en === 'string' && en.trim()) return en;

    const firstTranslation = Object.values(value).find(
      (translation): translation is string =>
        typeof translation === 'string' && translation.trim().length > 0,
    );
    if (firstTranslation) return firstTranslation;
  }

  return fallback;
};
