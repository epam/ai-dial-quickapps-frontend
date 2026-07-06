'use client';
import React, { useCallback } from 'react';
import { AgentAndToolsetChip, type ChipEntity } from './AgentAndToolsetChip';
import { OverflowButton } from './OverflowButton';
import { OverflowListItem } from './OverflowListItem';

interface SelectedItemsContainerProps {
  selectedIds: string[];
  allItemsMap: Record<string, ChipEntity | undefined>;
  onRemove: (id: string) => void;
  onItemClick?: (id: string) => void;
  onConfigure?: (item: ChipEntity) => void;
}

export const SelectedItemsContainer: React.FC<SelectedItemsContainerProps> = ({
  selectedIds,
  allItemsMap,
  onRemove,
  onItemClick,
  onConfigure,
}) => {
  const MAX_VISIBLE = 8;
  const visibleIds = selectedIds.slice(0, MAX_VISIBLE);
  const hiddenIds = selectedIds.slice(MAX_VISIBLE);

  const hiddenItems = hiddenIds.map((id) => ({
    id,
    data: allItemsMap[id],
  }));

  const renderOverflow = useCallback(
    () =>
      hiddenItems.length > 0 ? (
        <OverflowButton
          hiddenItems={hiddenItems}
          onRemove={onRemove}
          onItemClick={onItemClick}
          ItemComponent={OverflowListItem}
        />
      ) : null,
    [hiddenItems, onRemove, onItemClick],
  );

  return (
    <div className="flex flex-wrap gap-1">
      {visibleIds.map((id) => (
        <AgentAndToolsetChip
          key={id}
          id={id}
          item={allItemsMap[id]}
          onRemove={onRemove}
          onItemClick={onItemClick}
          onConfigure={onConfigure}
        />
      ))}
      {renderOverflow()}
    </div>
  );
};
