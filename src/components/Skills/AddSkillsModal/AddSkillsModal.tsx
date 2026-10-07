import { FC, ReactNode, useCallback, useMemo, useState } from 'react';

import {
  CatalogSelectionMode,
  CatalogSortKey,
  Filter,
  ListView,
  type CatalogItem,
} from '@epam/ai-dial-catalog';
import { getTopicOptions } from '@epam/ai-dial-catalog/mapping';
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
import { useTranslation } from '@/hooks/use-translation';
import { ResourceScope } from '@/types/resource-scope';
import { Translation } from '@/types/translation';
import { isHiddenDialFolderId } from '@/utils/api';
import { applySkillSelection } from '@/utils/apply-skill-selection';
import { filterCatalogItemsByQuery } from '@/utils/filter-catalog-items';
import { mapSkillToCatalogItem } from '@/utils/map-skill-to-catalog-item';

export interface AddSkillsModalProps {
  /** The attached skill ids; checked when the popup opens. */
  value: string[];
  /** Called with the new `agentSkills` value when the user confirms with Add. */
  onConfirm: (ids: string[]) => void;
  onClose: () => void;
}

const SORT_KEYS = [
  { value: CatalogSortKey.RecentlyUpdated, labelKey: QuickAppEditorI18nKeys.SortRecentlyUpdated },
  { value: CatalogSortKey.Newest, labelKey: QuickAppEditorI18nKeys.SortNewest },
  { value: CatalogSortKey.NameAZ, labelKey: QuickAppEditorI18nKeys.SortNameAZ },
];

/**
 * Skill picker popup: the skills catalog list with search, From filter, sort
 * and a checkbox per row; the checked set is committed only with Add. Mount
 * it only while open — search, filter, sort and the checked set then start
 * fresh every time it opens.
 */
export const AddSkillsModal: FC<AddSkillsModalProps> = ({ value, onConfirm, onClose }) => {
  const { t } = useTranslation(Translation.QuickAppEditor);
  const { t: tCommon } = useTranslation(Translation.Common);
  const { skills, userBucket, status, error: dataError, refreshAll } = useDataContext();

  const [search, setSearch] = useState('');
  const [topics, setTopics] = useState<Set<string>>(() => new Set());
  const [isMyOnly, setIsMyOnly] = useState(false);
  const [sortKey, setSortKey] = useState<string>(CatalogSortKey.RecentlyUpdated);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set(value));

  const isReady = status === 'ready';

  const scopeLabels = useMemo(
    () => ({
      [ResourceScope.Personal]: tCommon(CommonI18nKeys.PersonalScope),
      [ResourceScope.Shared]: tCommon(CommonI18nKeys.SharedScope),
      [ResourceScope.Organization]: tCommon(CommonI18nKeys.OrganizationScope),
    }),
    [tCommon],
  );

  const items = useMemo(
    () =>
      skills
        .filter((skill) => !isHiddenDialFolderId(skill.id))
        .map((skill) => mapSkillToCatalogItem(skill, { userBucket, scopeLabels })),
    [skills, userBucket, scopeLabels],
  );

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

  const selectRowAriaLabel = useCallback(
    (item: CatalogItem) => t(QuickAppEditorI18nKeys.SelectSkill, { name: item.name }),
    [t],
  );

  const handleConfirm = useCallback(() => {
    if (!isReady) return;
    onConfirm(applySkillSelection(value, checkedIds, listedIds));
  }, [isReady, onConfirm, value, checkedIds, listedIds]);

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
    if (status === 'loading' || status === 'idle') {
      return (
        <div className="flex items-center justify-center py-16">
          <Spinner
            size={32}
            fullWidth={false}
            ariaLabel={t(QuickAppEditorI18nKeys.LoadingSkills)}
          />
        </div>
      );
    }

    if (status === 'error') {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-8">
          <NoDataContent
            title={t(QuickAppEditorI18nKeys.FailedToLoadSkills)}
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
                : QuickAppEditorI18nKeys.NoAgentSkillsAdded,
            )}
          />
        </div>
      );
    }

    return (
      // The list windows its rows against the nearest scrolling ancestor, so
      // this wrapper is the scroll container and the column header sticks to it.
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ListView
          type={CatalogEntityType.Skill}
          items={rows}
          query={search}
          ariaLabel={t(QuickAppEditorI18nKeys.SkillsCatalog)}
          selectionMode={CatalogSelectionMode.Multiple}
          selectedItemIds={checkedIds}
          onSelectionChange={setCheckedIds}
          selectRowAriaLabel={selectRowAriaLabel}
          selectAllAriaLabel={t(QuickAppEditorI18nKeys.SelectAllSkills)}
          stickyHeaderTop={0}
          // Read-only drops the Favorite column: the editor has no skill favorites.
          isReadonly
        />
      </div>
    );
  };

  return (
    <Popup
      open
      header={t(QuickAppEditorI18nKeys.AddSkill)}
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
            title={t(QuickAppEditorI18nKeys.SkillsCatalog)}
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
              placeholder={t(QuickAppEditorI18nKeys.SearchAgentSkills)}
              aria-label={t(QuickAppEditorI18nKeys.SearchAgentSkills)}
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
