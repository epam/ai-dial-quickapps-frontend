import { useMemo } from 'react';

import { BasicI18nKeys, CatalogI18nKeys } from '@/constants/translation-keys';
import { useTranslation } from 'react-i18next';
import { ResourceScope } from '@/types/resource-scope';

/** Translated scope labels for catalog folder paths (Personal / Shared / Organization). */
export const useScopeLabels = (): Record<ResourceScope, string> => {
  const { t } = useTranslation();

  return useMemo(
    () => ({
      [ResourceScope.Personal]: t(CatalogI18nKeys.FolderPersonal),
      [ResourceScope.Shared]: t(CatalogI18nKeys.FolderSharedScope),
      [ResourceScope.Organization]: t(BasicI18nKeys.Organization),
    }),
    [t],
  );
};
