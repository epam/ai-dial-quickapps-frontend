import { CatalogLoadStatus, type CatalogPickerModalLabels } from '@epam/ai-dial-catalog';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { BasicI18nKeys, ButtonsI18nKeys, CatalogI18nKeys } from '@/constants/translation-keys';
import { useDataContext } from '@/context/DataContext';
import { LoadStatus } from '@/types/load-status';

/** The picker strings every catalog picker shares; each picker adds its own title and catalog. */
export type CatalogPickerSharedLabels = Omit<CatalogPickerModalLabels, 'title' | 'catalog'>;

export interface CatalogPickerSharedProps {
  labels: CatalogPickerSharedLabels;
  status: CatalogLoadStatus;
  /** The chat-api error message of the failed load, if it carried one. */
  error?: string;
  onRetry: () => void;
}

/**
 * What the catalog's pickers (Change model, Add toolset, Add agent, Add skill)
 * take from the app: the translated strings the library would otherwise show
 * in English, and the `DataContext` load state with `refreshAll` as Retry.
 */
export const useCatalogPickerSharedProps = (): CatalogPickerSharedProps => {
  const { t } = useTranslation();
  const { status, error, refreshAll } = useDataContext();

  const labels = useMemo<CatalogPickerSharedLabels>(
    () => ({
      noResults: t(BasicI18nKeys.NoResults),
      retry: t(ButtonsI18nKeys.Retry),
      sort: t(ButtonsI18nKeys.Sort),
      sortUpdated: t(CatalogI18nKeys.SortsUpdated),
      sortNewest: t(CatalogI18nKeys.SortNewest),
      sortNameAZ: t(CatalogI18nKeys.SortNameAZ),
      cancel: t(ButtonsI18nKeys.Cancel),
      add: t(ButtonsI18nKeys.Add),
      closeDialog: t(BasicI18nKeys.CloseDialog),
      clearSearch: t(BasicI18nKeys.ClearSearch),
      from: t(CatalogI18nKeys.BrowseSettingsFrom),
      my: t(CatalogI18nKeys.BrowseSettingsMy),
      topics: t(CatalogI18nKeys.BrowseSettingsTopics),
      clear: t(ButtonsI18nKeys.Clear),
      apply: t(ButtonsI18nKeys.Apply),
    }),
    [t],
  );

  let catalogStatus: CatalogLoadStatus;
  switch (status) {
    case LoadStatus.Ready:
      catalogStatus = CatalogLoadStatus.Ready;
      break;
    case LoadStatus.Error:
      catalogStatus = CatalogLoadStatus.Error;
      break;
    case LoadStatus.Idle:
    case LoadStatus.Loading:
    default:
      catalogStatus = CatalogLoadStatus.Loading;
      break;
  }

  return { labels, status: catalogStatus, error, onRetry: refreshAll };
};
