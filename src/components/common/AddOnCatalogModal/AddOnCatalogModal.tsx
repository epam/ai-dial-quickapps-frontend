import { FC, ReactNode, useCallback, useMemo, useState } from 'react';

import {
  CatalogSelectionMode,
  CatalogSortKey,
  Filter,
  ListView,
  type CatalogItem,
} from '@epam/ai-dial-catalog';
import { getTopicOptions } from '@epam/ai-dial-catalog/mapping';
import { type CatalogEntityType, ItemHeader } from '@epam/ai-dial-chat-shared';
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
import { useTranslation } from '@/hooks/use-translation';
import { LoadStatus } from '@/types/load-status';
import { Translation } from '@/types/translation';
import { applyCatalogSelection } from '@/utils/apply-catalog-selection';
import { filterCatalogItemsByQuery } from '@/utils/filter-catalog-items';

export interface AddOnCatalogModalLabels {
  /** Dialog title, e.g. "Add toolset". */
  title: string;
  /** Heading above the list and the grid's name, e.g. "Toolsets catalog". */
  catalog: string;
  /** Search placeholder and accessible name. */
  search: string;
  loading: string;
  failedToLoad: string;
  /** Empty-catalog title. */
  empty: string;
  selectAll: string;
  /** Accessible name of a row checkbox. */
  selectRow: (name: string) => string;
  /** Label of the logged-out badge on toolset avatars. */
  credentialsBadge?: string;
}

export interface AddOnCatalogModalProps {
  type: CatalogEntityType;
  /** The rows the user can pick from, already mapped and filtered. */
  items: CatalogItem[];
  /** Every attached id of the edited list; unlisted ones stay in place on Add. */
  attachedIds: string[];
  /** The attached ids that are checked when the popup opens. */
  initialCheckedIds: string[];
  labels: AddOnCatalogModalLabels;
  /** Called with the new full id list when the user confirms with Add. */
  onConfirm: (ids: string[]) => void;
  onClose: () => void;
}

const SORT_KEYS = [
  { value: CatalogSortKey.RecentlyUpdated, labelKey: QuickAppEditorI18nKeys.SortRecentlyUpdated },
  { value: CatalogSortKey.Newest, labelKey: QuickAppEditorI18nKeys.SortNewest },
  { value: CatalogSortKey.NameAZ, labelKey: QuickAppEditorI18nKeys.SortNameAZ },
];

/**
 * Add-on picker popup (Add toolset, Add agent): a catalog list with search,
 * From filter, sort and a checkbox per row; the checked set is committed only
 * with Add. Mount it only while open — search, filter, sort and the checked
 * set then start fresh every time it opens.
 */
export const AddOnCatalogModal: FC<AddOnCatalogModalProps> = ({
  type,
  items,
  attachedIds,
  initialCheckedIds,
  labels,
  onConfirm,
  onClose,
}) => {
  const { t } = useTranslation(Translation.QuickAppEditor);
  const { t: tCommon } = useTranslation(Translation.Common);
  const { status, error: dataError, refreshAll } = useDataContext();

  const [search, setSearch] = useState('');
  const [topics, setTopics] = useState<Set<string>>(() => new Set());
  const [isMyOnly, setIsMyOnly] = useState(false);
  const [sortKey, setSortKey] = useState<string>(CatalogSortKey.RecentlyUpdated);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set(initialCheckedIds));

  const isReady = status === LoadStatus.Ready;

  const listedIds = useMemo(() => new Set(items.map((item) => item.id)), [items]);

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

  const handleSearchChange = useCallback((next?: string) => setSearch(next ?? ''), []);

  const { selectRow } = labels;
  const selectRowAriaLabel = useCallback((item: CatalogItem) => selectRow(item.name), [selectRow]);

  const handleConfirm = useCallback(() => {
    if (!isReady) return;
    onConfirm(applyCatalogSelection(attachedIds, checkedIds, listedIds));
  }, [isReady, onConfirm, attachedIds, checkedIds, listedIds]);

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
        disabled: !isReady,
        onClick: handleConfirm,
      },
    ],
    [tCommon, onClose, isReady, handleConfirm],
  );

  const renderList = (): ReactNode => {
    if (status === LoadStatus.Loading || status === LoadStatus.Idle) {
      return (
        <div className="flex items-center justify-center py-16">
          <Spinner size={32} fullWidth={false} ariaLabel={labels.loading} />
        </div>
      );
    }

    if (status === LoadStatus.Error) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-8">
          <NoDataContent title={labels.failedToLoad} description={dataError} />
          <NeutralButton label={t(QuickAppEditorI18nKeys.Retry)} onClick={refreshAll} />
        </div>
      );
    }

    if (rows.length === 0) {
      const isFiltered = search.trim() !== '' || topics.size > 0 || isMyOnly;
      return (
        <div className="py-8">
          <NoDataContent
            title={isFiltered ? t(QuickAppEditorI18nKeys.NoResultsFound) : labels.empty}
          />
        </div>
      );
    }

    return (
      // The list windows its rows against the nearest scrolling ancestor, so
      // this wrapper is the scroll container and the column header sticks to it.
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ListView
          type={type}
          items={rows}
          query={search}
          ariaLabel={labels.catalog}
          selectionMode={CatalogSelectionMode.Multiple}
          selectedItemIds={checkedIds}
          onSelectionChange={setCheckedIds}
          selectRowAriaLabel={selectRowAriaLabel}
          selectAllAriaLabel={labels.selectAll}
          credentialsBadgeLoggedOutLabel={labels.credentialsBadge}
          stickyHeaderTop={0}
          // Read-only drops the Favorite column: the editor has no favorites.
          isReadonly
        />
      </div>
    );
  };

  return (
    <Popup
      open
      header={labels.title}
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
            title={labels.catalog}
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
              placeholder={labels.search}
              aria-label={labels.search}
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
