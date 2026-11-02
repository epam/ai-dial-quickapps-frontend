import { FC, useCallback, useMemo, useState } from 'react';

import {
  CatalogPickerModal,
  type CatalogItem,
  type CatalogPickerModalLabels,
} from '@epam/ai-dial-catalog';
import { CatalogEntityType } from '@epam/ai-dial-chat-shared';

import {
  ApplicationEditorI18nKeys,
  BasicI18nKeys,
  DeploymentSelectorI18nKeys,
} from '@/constants/translation-keys';
import { useDataContext } from '@/context/DataContext';
import { useCatalogPickerSharedProps } from '@/hooks/use-catalog-picker-shared-props';
import { useScopeLabels } from '@/hooks/use-scope-labels';
import { useTranslation } from 'react-i18next';
import { DialEntityType } from '@/types/dial-entities';
import { isHiddenDialFolderId } from '@/utils/api';
import { mapModelToCatalogItem } from '@/utils/map-model-to-catalog-item';

export interface ModelCatalogModalProps {
  /** Current model id; pre-selected when the picker opens. */
  value: string;
  /** Called with the selected model id when the user confirms with Add. */
  onConfirm: (modelId: string) => void;
  onClose: () => void;
}

// Models always show where they live, even though the catalog hides the
// Folder column for models by default. The editor has no favorites, so the Favorite column is
// dropped.
const COLUMN_VISIBILITY = { folder: () => true, favorite: () => false };

/**
 * Model picker popup: the models catalog list with search, From filter and
 * sort; a row is committed only with Add. Mount it only while open — search,
 * filter, sort and the selected row then start fresh every time it opens.
 */
export const ModelCatalogModal: FC<ModelCatalogModalProps> = ({ value, onConfirm, onClose }) => {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const { modelsWithFavorites: models, userBucket } = useDataContext();
  const scopeLabels = useScopeLabels();
  const { labels: sharedLabels, ...loadState } = useCatalogPickerSharedProps();

  const [selectedId, setSelectedId] = useState(value);

  // Only tool-supporting models can be picked — applications (agents,
  // including the app being edited) and models without tools are not listed.
  const items = useMemo(
    () =>
      models
        .filter(
          (m) =>
            m.type === DialEntityType.Model && !!m.features?.tools && !isHiddenDialFolderId(m.id),
        )
        .map((m) => mapModelToCatalogItem(m, { language, userBucket, scopeLabels })),
    [models, language, userBucket, scopeLabels],
  );

  const labels = useMemo<CatalogPickerModalLabels>(
    () => ({
      ...sharedLabels,
      title: t(ApplicationEditorI18nKeys.OrchestratorChangeModel),
      catalog: t(ApplicationEditorI18nKeys.OrchestratorCatalogTitle),
      search: t(ApplicationEditorI18nKeys.OrchestratorSearchPlaceholder),
      loading: t(DeploymentSelectorI18nKeys.Loading),
      failedToLoad: t(DeploymentSelectorI18nKeys.Error),
      empty: t(BasicI18nKeys.NotAvailable),
    }),
    [t, sharedLabels],
  );

  // A selection hidden by search or filter still counts — only an id that
  // isn't a selectable model (e.g. a saved application) can't be confirmed.
  const isSelectable = items.some((item) => item.id === selectedId);

  const handleItemClick = useCallback((item: CatalogItem) => setSelectedId(item.id), []);

  const handleConfirm = useCallback(() => onConfirm(selectedId), [onConfirm, selectedId]);

  return (
    <CatalogPickerModal
      items={items}
      labels={labels}
      {...loadState}
      isConfirmDisabled={!isSelectable}
      onConfirm={handleConfirm}
      onClose={onClose}
      // The list selects a row on click, and on Enter or Space once it has focus.
      listProps={{
        type: CatalogEntityType.Model,
        selectedItemId: selectedId,
        onItemClick: handleItemClick,
        columnVisibility: COLUMN_VISIBILITY,
      }}
    />
  );
};
