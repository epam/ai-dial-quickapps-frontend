'use client';
import React, { useCallback, useMemo, useState } from 'react';
import classNames from 'classnames';
import sortBy from 'lodash-es/sortBy';
import { IconLayoutGrid } from '@tabler/icons-react';

import { ModelIcon } from '@/components/common/ModelIcon/ModelIcon';
import { TopicsLine } from '@/components/common/TopicsLine/TopicsLine';
import { CommonI18nKeys, MarketplaceI18nKeys } from '@/constants/i18n';
import { useDataContext } from '@/context/DataContext';
import { useTranslation } from '@/hooks/useTranslation';
import { Translation } from '@/types/translation';
import { isApplicationId, isHiddenDialFolderId } from '@/utils/api';
import { getEntityStatus } from '@/utils/get-entity-status';
import {
  DialNeutralButton,
  DialNoDataContent,
  DialPopup,
  DialPrimaryButton,
  DialSearch,
  PopupSize,
} from '@epam/ai-dial-ui-kit';

import { AgentAndToolsetChip, type ChipEntity } from './AgentAndToolsetChip';

interface AgentAndToolsetModalProps {
  initialSelectedIds: string[];
  allItemsMap: Record<string, ChipEntity | undefined>;
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
}

interface AgentAndToolsetCardProps {
  item: ChipEntity;
  isSelected: boolean;
  onToggle: (id: string) => void;
}

const AgentAndToolsetCard: React.FC<AgentAndToolsetCardProps> = ({
  item,
  isSelected,
  onToggle,
}) => {
  const { t } = useTranslation(Translation.Common);
  const name = item.name ?? item.id;
  const iconUrl = typeof item.iconUrl === 'string' ? (item.iconUrl as string) : undefined;
  const description =
    typeof item.description === 'string' ? (item.description as string) : undefined;
  const { isError } = getEntityStatus(item);
  const entityTypeLabel = t(
    isApplicationId(item.id) ? CommonI18nKeys.AgentEntityType : CommonI18nKeys.ToolsetEntityType,
  );

  return (
    <article
      onClick={() => onToggle(item.id)}
      className={classNames(
        'relative box-border flex cursor-pointer flex-col gap-[14px] rounded-[16px] border p-[11px] md:p-[15px]',
        'bg-layer-0 shadow-[0_1px_3px_rgba(0,0,0,0.04)]',
        'transition-[transform,box-shadow] duration-[180ms] ease-out',
        'hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04)]',
        isError
          ? 'border-error'
          : isSelected
            ? 'border-accent-primary'
            : 'border-[rgba(0,0,0,0.07)]',
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <ModelIcon name={name} iconUrl={iconUrl} size={44} radius={12} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="dial-caption-text mb-2 font-semibold uppercase tracking-[0.06em] text-accent-primary">
            {entityTypeLabel}
          </span>
          <span className="dial-body-semi-text min-w-0 truncate text-primary">{name}</span>
          {item.version && (
            <span className="dial-tiny-text truncate text-secondary">{item.version}</span>
          )}
        </div>
      </div>

      {description && <p className="dial-small-text line-clamp-2 text-secondary">{description}</p>}

      <div className="min-h-[22px]">
        <TopicsLine topics={(item.topics as string[] | undefined) ?? []} />
      </div>
    </article>
  );
};

export const AgentAndToolsetModal: React.FC<AgentAndToolsetModalProps> = ({
  initialSelectedIds,
  allItemsMap,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation(Translation.Marketplace);
  const { models, toolsets, status } = useDataContext();
  const isLoading = status === 'loading' || status === 'idle';

  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [search, setSearch] = useState('');

  const allItems = useMemo<ChipEntity[]>(
    () => [
      ...models.filter((m) => m.type === 'application'),
      ...toolsets.filter((toolset) => !isHiddenDialFolderId(toolset.id)),
    ],
    [models, toolsets],
  );

  const sortedItems = useMemo(
    () => sortBy(allItems, [(item) => (item.name ?? item.id).toLowerCase()]),
    [allItems],
  );

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return sortedItems;
    return sortedItems.filter(
      (item) =>
        (item.name ?? '').toLowerCase().includes(query) || item.id.toLowerCase().includes(query),
    );
  }, [sortedItems, search]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const handleRemoveSelected = useCallback((id: string) => {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  }, []);

  const handleConfirm = useCallback(() => {
    const existing = initialSelectedIds.filter((id) => selectedIds.includes(id));
    const added = selectedIds.filter((id) => !initialSelectedIds.includes(id));
    onConfirm([...existing, ...added]);
  }, [initialSelectedIds, onConfirm, selectedIds]);

  return (
    <DialPopup
      open
      header={t(MarketplaceI18nKeys.SelectAgentsAndToolsets)}
      size={PopupSize.Lg}
      onClose={onClose}
      footer={
        <div className="flex w-full justify-end gap-2 px-6 py-4">
          <DialNeutralButton label={t(CommonI18nKeys.Cancel)} onClick={onClose} />
          <DialPrimaryButton label={t(MarketplaceI18nKeys.ApplyChanges)} onClick={handleConfirm} />
        </div>
      }
    >
      <div className="flex max-h-[60vh] flex-col gap-3 px-6 py-4">
        <DialSearch
          placeholder={t(MarketplaceI18nKeys.SearchPlaceholder)}
          value={search}
          onChange={setSearch}
          autoFocus
        />

        <div>
          {selectedIds.length ? (
            <>
              <p className="dial-tiny-text mb-2 text-secondary">
                {t(MarketplaceI18nKeys.SelectedLabel)}
              </p>
              <div className="flex min-h-[34px] flex-wrap gap-1">
                {selectedIds.map((id) => (
                  <AgentAndToolsetChip
                    key={id}
                    id={id}
                    item={allItemsMap[id]}
                    onRemove={handleRemoveSelected}
                    isInSelectionList
                  />
                ))}
              </div>
            </>
          ) : (
            <p className="dial-tiny-text flex h-[34px] items-center text-secondary">
              {t(MarketplaceI18nKeys.NoResourcesSelected)}
            </p>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="size-6 animate-spin rounded-full border-2 border-tertiary border-t-accent-primary" />
            </div>
          ) : filteredItems.length === 0 ? (
            <DialNoDataContent
              title={t(CommonI18nKeys.NoAgentsAndToolsetsAdded)}
              icon={<IconLayoutGrid size={60} stroke={0.5} />}
            />
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {filteredItems.map((item) => (
                <AgentAndToolsetCard
                  key={item.id}
                  item={item}
                  isSelected={selectedSet.has(item.id)}
                  onToggle={toggle}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </DialPopup>
  );
};
