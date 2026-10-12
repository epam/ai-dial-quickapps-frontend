import { FC, useCallback, useMemo, useState } from 'react';

import { ListView, type CatalogItem } from '@epam/ai-dial-catalog';
import { CatalogEntityType } from '@epam/ai-dial-chat-shared';

import {
  CatalogPickerModal,
  type CatalogPickerModalLabels,
} from '@/components/common/CatalogPickerModal/CatalogPickerModal';
import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useDataContext } from '@/context/DataContext';
import { useGridRowKeyboardSelect } from '@/hooks/use-grid-row-keyboard-select';
import { useScopeLabels } from '@/hooks/use-scope-labels';
import { useTranslation } from '@/hooks/use-translation';
import { DialEntityType } from '@/types/dial-entities';
import { Translation } from '@/types/translation';
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
// Folder column for models by default.
const COLUMN_VISIBILITY = { folder: () => true };

/**
 * Model picker popup: the models catalog list with search, From filter and
 * sort; a row is committed only with Add. Mount it only while open — search,
 * filter, sort and the selected row then start fresh every time it opens.
 */
export const ModelCatalogModal: FC<ModelCatalogModalProps> = ({ value, onConfirm, onClose }) => {
  const { t, language } = useTranslation(Translation.QuickAppEditor);
  const { modelsWithFavorites: models, userBucket } = useDataContext();
  const scopeLabels = useScopeLabels();

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
      title: t(QuickAppEditorI18nKeys.ChangeModel),
      catalog: t(QuickAppEditorI18nKeys.ModelsCatalog),
      search: t(QuickAppEditorI18nKeys.SearchModels),
      loading: t(QuickAppEditorI18nKeys.LoadingModels),
      failedToLoad: t(QuickAppEditorI18nKeys.FailedToLoadModels),
      empty: t(QuickAppEditorI18nKeys.NotAvailable),
    }),
    [t],
  );

  // A selection hidden by search or filter still counts — only an id that
  // isn't a selectable model (e.g. a saved application) can't be confirmed.
  const isSelectable = items.some((item) => item.id === selectedId);

  const handleItemClick = useCallback((item: CatalogItem) => setSelectedId(item.id), []);
  const handleListKeyDown = useGridRowKeyboardSelect(setSelectedId);

  const handleConfirm = useCallback(() => onConfirm(selectedId), [onConfirm, selectedId]);

  const renderList = (rows: CatalogItem[], query: string) => (
    // The list windows its rows against the nearest scrolling ancestor, so
    // this wrapper is the scroll container and the column header sticks to
    // its top. The catalog marks the selected row with a 2px border that
    // pushes the row content in and sits on the table edge (ag-grid rows have
    // a fixed width); a 1px inset outline draws the same accent without either.
    // An outline (not an inset shadow) so the cells can't paint over its
    // bottom edge, and z-index so the next row can't either.
    // Targets the CSS-module class by its stable name until the catalog
    // exposes the border width (see docs/TECH_DEBT.md). No underscores in
    // the selector: Tailwind turns `_` into a space in arbitrary variants.
    <div
      className="min-h-0 flex-1 overflow-y-auto [&_[class*='selectedRow']]:z-[1] [&_[class*='selectedRow']]:!border-0 [&_[class*='selectedRow']]:!outline [&_[class*='selectedRow']]:!outline-1 [&_[class*='selectedRow']]:!-outline-offset-1 [&_[class*='selectedRow']]:!outline-accent"
      onKeyDown={handleListKeyDown}
    >
      <ListView
        type={CatalogEntityType.Model}
        items={rows}
        query={query}
        ariaLabel={labels.catalog}
        selectedItemId={selectedId}
        onItemClick={handleItemClick}
        columnVisibility={COLUMN_VISIBILITY}
        stickyHeaderTop={0}
        isReadonly
      />
    </div>
  );

  return (
    <CatalogPickerModal
      items={items}
      labels={labels}
      isConfirmDisabled={!isSelectable}
      onConfirm={handleConfirm}
      onClose={onClose}
      renderList={renderList}
    />
  );
};
