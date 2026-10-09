import { FC, ReactNode, useCallback, useMemo, useState } from 'react';

import { CatalogSortKey, Filter, ListView, type CatalogItem } from '@epam/ai-dial-catalog';
import { CatalogEntityType, ItemHeader } from '@epam/ai-dial-chat-shared';
import {
  ButtonAppearance,
  ButtonDropdown,
  ButtonVariant,
  ElementSize,
  MenuItemMark,
  NeutralButton,
  NoDataContent,
  Popup,
  PopupSize,
  Search,
  Spinner,
  type DropdownItem,
} from '@epam/ai-dial-ui-kit';

import { CommonI18nKeys, QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useDataContext } from '@/context/DataContext';
import { useGridRowKeyboardSelect } from '@/hooks/use-grid-row-keyboard-select';
import { useTranslation } from '@/hooks/use-translation';
import { DialEntityType } from '@/types/dial-entities';
import { LoadStatus } from '@/types/load-status';
import { ResourceScope } from '@/types/resource-scope';
import { Translation } from '@/types/translation';
import { isHiddenDialFolderId } from '@/utils/api';
import { filterCatalogItemsByQuery } from '@/utils/filter-catalog-items';
import { mapModelToCatalogItem } from '@/utils/map-model-to-catalog-item';
import { getTopicOptions } from '@epam/ai-dial-catalog/mapping';

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

const SORT_KEYS = [
  { value: CatalogSortKey.RecentlyUpdated, labelKey: QuickAppEditorI18nKeys.SortRecentlyUpdated },
  { value: CatalogSortKey.Newest, labelKey: QuickAppEditorI18nKeys.SortNewest },
  { value: CatalogSortKey.NameAZ, labelKey: QuickAppEditorI18nKeys.SortNameAZ },
];

/**
 * Model picker popup: the models catalog list with search, From filter and
 * sort; a row is committed only with Add. Mount it only while open — search,
 * filter, sort and the selected row then start fresh every time it opens.
 */
export const ModelCatalogModal: FC<ModelCatalogModalProps> = ({ value, onConfirm, onClose }) => {
  const { t, language } = useTranslation(Translation.QuickAppEditor);
  const { t: tCommon } = useTranslation(Translation.Common);
  const {
    modelsWithFavorites: models,
    userBucket,
    status,
    error: dataError,
    refreshAll,
  } = useDataContext();

  const [search, setSearch] = useState('');
  const [topics, setTopics] = useState<Set<string>>(() => new Set());
  const [isMyOnly, setIsMyOnly] = useState(false);
  const [sortKey, setSortKey] = useState<string>(CatalogSortKey.RecentlyUpdated);
  const [selectedId, setSelectedId] = useState(value);

  const isReady = status === LoadStatus.Ready;

  const scopeLabels = useMemo(
    () => ({
      [ResourceScope.Personal]: tCommon(CommonI18nKeys.PersonalScope),
      [ResourceScope.Shared]: tCommon(CommonI18nKeys.SharedScope),
      [ResourceScope.Organization]: tCommon(CommonI18nKeys.OrganizationScope),
    }),
    [tCommon],
  );

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

  const topicOptions = useMemo(() => getTopicOptions(items), [items]);

  const rows = useMemo(
    () => filterCatalogItemsByQuery(items, { search, topics, isMyOnly, sortKey }),
    [items, search, topics, isMyOnly, sortKey],
  );

  const sortOptions = useMemo(
    () => SORT_KEYS.map(({ value: key, labelKey }) => ({ value: key, label: t(labelKey) })),
    [t],
  );

  const sortItems = useMemo<DropdownItem[]>(
    () =>
      sortOptions.map((option) => ({
        key: option.value,
        label: option.label,
        mark: MenuItemMark.Check,
        checked: option.value === sortKey,
        onClick: () => setSortKey(option.value),
      })),
    [sortOptions, sortKey],
  );

  const activeSortLabel =
    sortOptions.find((option) => option.value === sortKey)?.label ??
    t(QuickAppEditorI18nKeys.SortLabel);

  // A selection hidden by search or filter still counts — only an id that
  // isn't a selectable model (e.g. a saved application) can't be confirmed.
  const canConfirm = isReady && items.some((item) => item.id === selectedId);

  const handleItemClick = useCallback((item: CatalogItem) => setSelectedId(item.id), []);
  const handleListKeyDown = useGridRowKeyboardSelect(setSelectedId);

  const handleSearchChange = useCallback((next?: string) => setSearch(next ?? ''), []);

  const handleConfirm = useCallback(() => {
    if (canConfirm) onConfirm(selectedId);
  }, [canConfirm, onConfirm, selectedId]);

  const mainButtons = useMemo(
    () => [
      {
        label: tCommon(CommonI18nKeys.Cancel),
        variant: ButtonVariant.Primary,
        appearance: ButtonAppearance.Ghost,
        onClick: onClose,
      },
      {
        label: tCommon(CommonI18nKeys.Add),
        disabled: !canConfirm,
        onClick: handleConfirm,
      },
    ],
    [tCommon, onClose, canConfirm, handleConfirm],
  );

  const renderList = (): ReactNode => {
    if (status === LoadStatus.Loading || status === LoadStatus.Idle) {
      return (
        <div className="flex items-center justify-center py-16">
          <Spinner
            size={32}
            fullWidth={false}
            ariaLabel={t(QuickAppEditorI18nKeys.LoadingModels)}
          />
        </div>
      );
    }

    if (status === LoadStatus.Error) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-8">
          <NoDataContent
            title={t(QuickAppEditorI18nKeys.FailedToLoadModels)}
            description={dataError}
          />
          <NeutralButton label={t(QuickAppEditorI18nKeys.Retry)} onClick={refreshAll} />
        </div>
      );
    }

    if (rows.length === 0) {
      const isFiltered = search.trim() !== '' || topics.size > 0 || isMyOnly;
      return (
        <div className="py-8">
          <NoDataContent
            title={t(
              isFiltered
                ? QuickAppEditorI18nKeys.NoResultsFound
                : QuickAppEditorI18nKeys.NotAvailable,
            )}
          />
        </div>
      );
    }

    return (
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
          query={search}
          ariaLabel={t(QuickAppEditorI18nKeys.ModelsCatalog)}
          selectedItemId={selectedId}
          onItemClick={handleItemClick}
          columnVisibility={COLUMN_VISIBILITY}
          stickyHeaderTop={0}
          isReadonly
        />
      </div>
    );
  };

  return (
    <Popup
      open
      header={t(QuickAppEditorI18nKeys.ChangeModel)}
      headerDivider
      footerDivider
      size={PopupSize.Lg}
      closeAriaLabel={tCommon(CommonI18nKeys.CloseDialog)}
      bodyClassName="flex h-[70vh] flex-col overflow-hidden px-6 pb-5 pt-6"
      mainButtons={mainButtons}
      onClose={onClose}
    >
      <div className="flex shrink-0 flex-col gap-3 pb-5">
        <div className="flex items-center gap-2">
          <ItemHeader
            title={t(QuickAppEditorI18nKeys.ModelsCatalog)}
            postfix={isReady ? rows.length : undefined}
            titleClassName="dial-body-semi-text"
            shouldTruncateTitle={false}
          />
          <div className="ms-auto shrink-0">
            <ButtonDropdown
              items={sortItems}
              label={activeSortLabel}
              variant={ButtonVariant.Primary}
              appearance={ButtonAppearance.Ghost}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div role="search" className="flex-1">
            <Search
              value={search}
              onChange={handleSearchChange}
              size={ElementSize.Large}
              // Matches the 48px Filter button, as the catalog's own toolbar does.
              wrapperClassName="dial-kit-input-large"
              placeholder={t(QuickAppEditorI18nKeys.SearchModels)}
              aria-label={t(QuickAppEditorI18nKeys.SearchModels)}
              clearLabel={tCommon(CommonI18nKeys.ClearSearch)}
            />
          </div>
          <Filter
            checked={topics}
            onChange={setTopics}
            values={topicOptions}
            isMyAppsActive={isMyOnly}
            onMyAppsChange={setIsMyOnly}
            defaultLabel={t(QuickAppEditorI18nKeys.FilterFrom)}
            myAppsLabel={t(QuickAppEditorI18nKeys.FilterMy)}
            topicsLabel={t(QuickAppEditorI18nKeys.FilterTopics)}
            clearLabel={t(QuickAppEditorI18nKeys.FilterClear)}
            applyLabel={t(QuickAppEditorI18nKeys.FilterApply)}
          />
        </div>
      </div>

      {renderList()}
    </Popup>
  );
};
