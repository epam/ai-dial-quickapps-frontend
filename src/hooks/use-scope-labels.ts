import { useMemo } from 'react';

import { CommonI18nKeys } from '@/constants/i18n';
import { useTranslation } from '@/hooks/use-translation';
import { ResourceScope } from '@/types/resource-scope';
import { Translation } from '@/types/translation';

/** Translated scope labels for catalog folder paths (Personal / Shared / Organization). */
export const useScopeLabels = (): Record<ResourceScope, string> => {
  const { t } = useTranslation(Translation.Common);

  return useMemo(
    () => ({
      [ResourceScope.Personal]: t(CommonI18nKeys.PersonalScope),
      [ResourceScope.Shared]: t(CommonI18nKeys.SharedScope),
      [ResourceScope.Organization]: t(CommonI18nKeys.OrganizationScope),
    }),
    [t],
  );
};
