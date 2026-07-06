'use client';
import { useCallback, useMemo } from 'react';
import { useTranslation as useI18nTranslation } from 'react-i18next';
import type { Translation, TranslationOptions } from '@/types/translation';

export function useTranslation(ns: Translation) {
  const { t } = useI18nTranslation(ns);

  const translate = useCallback(
    (key: string, options?: TranslationOptions) =>
      ((options
        ? t(key, options as Record<string, unknown>)
        : t(key)) as unknown as string) ?? key,
    [t],
  );

  return useMemo(() => ({ t: translate }), [translate]);
}
