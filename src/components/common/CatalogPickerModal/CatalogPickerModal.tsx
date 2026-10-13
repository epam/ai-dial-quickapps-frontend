import { FC, ReactNode, useCallback, useMemo, useState } from 'react';

import { CatalogSortKey, Filter, type CatalogItem } from '@epam/ai-dial-catalog';
import { getTopicOptions } from '@epam/ai-dial-catalog/mapping';
import { ItemHeader } from '@epam/ai-dial-chat-shared';
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
import { MOBILE_FULLSCREEN_POPUP_CLASS_NAMES } from '@/constants/popup';
import { useDataContext } from '@/context/DataContext';
import { useTranslation } from '@/hooks/use-translation';
import { LoadStatus } from '@/types/load-status';
import { Translation } from '@/types/translation';
import { filterCatalogItemsByQuery } from '@/utils/filter-catalog-items';

export interface CatalogPickerModalLabels {
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
}

export interface CatalogPickerModalProps {
  /** The rows the user can pick from, already mapped and filtered. */
  items: CatalogItem[];
  labels: CatalogPickerModalLabels;
  /** Keeps Add disabled on top of the data not being ready yet. */
  isConfirmDisabled?: boolean;
  /** Called when the user confirms with Add. */
  onConfirm: () => void;
  onClose: () => void;
  /** Renders the catalog list for the searched, filtered and sorted rows. */
  renderList: (rows: CatalogItem[], query: string) => ReactNode;
}

const SORT_KEYS = [
  { value: CatalogSortKey.RecentlyUpdated, labelKey: QuickAppEditorI18nKeys.SortRecentlyUpdated },
  { value: CatalogSortKey.Newest, labelKey: QuickAppEditorI18nKeys.SortNewest },
  { value: CatalogSortKey.NameAZ, labelKey: QuickAppEditorI18nKeys.SortNameAZ },
];

/**
 * Shell of the catalog picker popups (Add toolset, Add agent, Change model):
 * the header with sort, search and From filter, and the loading, error and
 * empty states; the list itself and its selection come from `renderList`.
 * Mount it only while open — search, filter and sort then start fresh every
 * time it opens.
 */
export const CatalogPickerModal: FC<CatalogPickerModalProps> = ({
  items,
  labels,
  isConfirmDisabled = false,
  onConfirm,
  onClose,
  renderList,
}) => {
  const { t } = useTranslation(Translation.QuickAppEditor);
  const { t: tCommon } = useTranslation(Translation.Common);
  const { status, error: dataError, refreshAll } = useDataContext();

  const [search, setSearch] = useState('');
  const [topics, setTopics] = useState<Set<string>>(() => new Set());
  const [isMyOnly, setIsMyOnly] = useState(false);
  const [sortKey, setSortKey] = useState<string>(CatalogSortKey.RecentlyUpdated);

  const isReady = status === LoadStatus.Ready;
  const canConfirm = isReady && !isConfirmDisabled;

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

  const handleConfirm = useCallback(() => {
    if (canConfirm) onConfirm();
  }, [canConfirm, onConfirm]);

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

  const renderBody = (): ReactNode => {
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

    return renderList(rows, search);
  };

  return (
    <Popup
      open
      header={labels.title}
      headerDivider
      footerDivider
      size={PopupSize.Lg}
      {...MOBILE_FULLSCREEN_POPUP_CLASS_NAMES}
      closeAriaLabel={tCommon(CommonI18nKeys.CloseDialog)}
      // Below `md` the body takes what the full-screen popup leaves; from `md` up it is fixed.
      bodyClassName="flex min-h-0 flex-col overflow-hidden px-4 pb-4 pt-4 md:h-[70vh] md:px-6 md:pb-5 md:pt-6"
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

      {renderBody()}
    </Popup>
  );
};
