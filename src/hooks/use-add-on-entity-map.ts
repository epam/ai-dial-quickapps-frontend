import { useMemo } from 'react';

import { useDataContext } from '@/context/DataContext';
import { useTranslation } from '@/hooks/use-translation';
import { Translation } from '@/types/translation';
import { type AddOnEntityMap, buildAddOnEntityMap } from '@/utils/get-add-on-kind';

/** Every entity an `addOns` entry can point at, from `DataContext`. */
export const useAddOnEntityMap = (): AddOnEntityMap => {
  const { language } = useTranslation(Translation.QuickAppEditor);
  const { models, toolsets, mcpAgents } = useDataContext();

  return useMemo(
    () => buildAddOnEntityMap(models, toolsets, mcpAgents, language),
    [models, toolsets, mcpAgents, language],
  );
};
