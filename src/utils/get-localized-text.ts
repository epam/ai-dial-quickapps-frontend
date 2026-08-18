import type { LocalizedText } from '@/types/dial-entities';
import type { LocaleTextEntryDto } from '@/types/editor-messages';

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

/**
 * Recombines a General-step field split across `TriggerSaveGeneralPayload`
 * (primary-locale value + other locales in `locales`) back into the single
 * `LocalizedText` dictionary DIAL Core expects. Returns a plain string when
 * there's nothing to merge (no `primaryLocale`, or no other-locale value for
 * this field), so untranslated apps still round-trip as a bare string.
 */
export const buildLocalizedText = (
  primaryValue: string | undefined,
  primaryLocale: string | undefined,
  locales: LocaleTextEntryDto[] | undefined,
  field: 'name' | 'description',
): LocalizedText | undefined => {
  const dict: Record<string, string> = {};
  if (primaryLocale && primaryValue != null) {
    dict[primaryLocale] = primaryValue;
  }
  locales?.forEach((entry) => {
    const value = entry[field];
    if (value != null) dict[entry.language] = value;
  });

  return Object.keys(dict).length > 0 ? dict : primaryValue;
};
