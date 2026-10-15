import { useMemo } from 'react';

import { useDataContext } from '@/context/DataContext';
import { useTranslation } from 'react-i18next';
import { type AddOnEntityMap, buildAddOnEntityMap } from '@/utils/get-add-on-kind';

/** Every entity an `addOns` entry can point at, from `DataContext`. */
export const useAddOnEntityMap = (): AddOnEntityMap => {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const { models, toolsets, mcpAgents } = useDataContext();

  return useMemo(
    () => buildAddOnEntityMap(models, toolsets, mcpAgents, language),
    [models, toolsets, mcpAgents, language],
  );
};
