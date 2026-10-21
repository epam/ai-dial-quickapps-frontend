import { FC, useCallback, useMemo, useState } from 'react';

import { ListView, type CatalogItem } from '@epam/ai-dial-catalog';
import { mergeClasses } from '@epam/ai-dial-ui-kit';
import { CatalogEntityType } from '@epam/ai-dial-chat-shared';

import {
  CatalogPickerModal,
  type CatalogPickerModalLabels,
} from '@/components/common/CatalogPickerModal/CatalogPickerModal';
import { ApplicationEditorI18nKeys, BasicI18nKeys, DeploymentSelectorI18nKeys } from '@/constants/translation-keys';
import { useDataContext } from '@/context/DataContext';
import { useGridRowKeyboardSelect } from '@/hooks/use-grid-row-keyboard-select';
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

// The grid lays its columns out once with fit-to-width and again, differently, as soon as its
// options change (the first selection or search), so the Name column jumps wider. Pin the
// proportions the second layout settles on — Type fixed, Name twice Folder or Tags — so a
// selection only adds the check mark. Cells and headers are matched by their stable `col-id`.
// No underscores outside calc(): Tailwind turns `_` into a space in arbitrary values.
const COLUMN_WIDTH_CLASS_NAMES = [
  '[&_[col-id=name]]:!start-0 [&_[col-id=name]]:!w-[calc((100%-110px)/2)]',
  '[&_[col-id=type]]:!start-[calc((100%-110px)/2)] [&_[col-id=type]]:!w-[110px]',
  '[&_[col-id=folder]]:!start-[calc((100%-110px)/2+110px)] [&_[col-id=folder]]:!w-[calc((100%-110px)/4)]',
  '[&_[col-id=topics]]:!start-[calc((100%-110px)*3/4+110px)] [&_[col-id=topics]]:!w-[calc((100%-110px)/4)]',
].join(' ');

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
      title: t(ApplicationEditorI18nKeys.OrchestratorChangeModel),
      catalog: t(ApplicationEditorI18nKeys.OrchestratorCatalogTitle),
      search: t(ApplicationEditorI18nKeys.OrchestratorSearchPlaceholder),
      loading: t(DeploymentSelectorI18nKeys.Loading),
      failedToLoad: t(DeploymentSelectorI18nKeys.Error),
      empty: t(BasicI18nKeys.NotAvailable),
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
      className={mergeClasses(
        COLUMN_WIDTH_CLASS_NAMES,
        "min-h-0 flex-1 overflow-y-auto [&_[class*='selectedRow']]:z-[1] [&_[class*='selectedRow']]:!border-0 [&_[class*='selectedRow']]:!outline [&_[class*='selectedRow']]:!outline-1 [&_[class*='selectedRow']]:!-outline-offset-1 [&_[class*='selectedRow']]:!outline-accent",
      )}
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
