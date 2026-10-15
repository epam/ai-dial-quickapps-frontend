import type { LocalizedText } from '@/types/dial-entities';
import type { HostLocaleTextEntry } from '@/types/editor-messages';

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

// chat-api's `composeLocalizedFields` stores the primary value under this
// locale when the host sends `locales` without a `primaryLocale`.
const DEFAULT_PRIMARY_LOCALE = 'en';

/**
 * Recombines a General-step field split across `TriggerSaveGeneralPayload`
 * (primary-locale value + other locales in `locales`) into the `LocalizedText`
 * chat-api stores for the same request. Mirrors chat-api's
 * `composeLocalizedFields`, so change detection compares against what is
 * actually saved: a plain value without `locales`, otherwise a dictionary of the
 * primary value plus every non-empty translation.
 */
export const buildLocalizedText = (
  primaryValue: string | undefined,
  primaryLocale: string | undefined,
  locales: HostLocaleTextEntry[] | undefined,
  field: 'name' | 'description',
): LocalizedText | undefined => {
  if (!locales?.length) return primaryValue;

  const dict: Record<string, string> = {};
  if (primaryValue != null) {
    dict[primaryLocale ?? DEFAULT_PRIMARY_LOCALE] = primaryValue;
  }
  locales.forEach((entry) => {
    const value = entry[field];
    if (value) dict[entry.language] = value;
  });

  return Object.keys(dict).length > 0 ? dict : undefined;
};
