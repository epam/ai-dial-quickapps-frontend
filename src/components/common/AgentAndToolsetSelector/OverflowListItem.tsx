'use client';
import React, { useCallback } from 'react';
import classNames from 'classnames';
import { getEntityNameFromId, getVersionFromId } from '@/utils/api';
import { getLocalizedText } from '@/utils/get-localized-text';
import { useTranslation } from '@/hooks/useTranslation';
import { Translation } from '@/types/translation';
import { CloseButtonSmall } from '@/components/common/CloseButtons';
import { DialTooltip } from '@epam/ai-dial-ui-kit';
import { ChipTitle } from './ChipTitle';
import { ChipTooltipContent } from './ChipTooltipContent';
import type { ChipEntity } from './AgentAndToolsetChip';

interface OverflowListItemProps {
  id: string;
  item?: ChipEntity;
  onRemove: (id: string) => void;
  onItemClick?: (id: string) => void;
}

export const OverflowListItem: React.FC<OverflowListItemProps> = ({
  id,
  item,
  onRemove,
  onItemClick,
}) => {
  const { language } = useTranslation(Translation.Common);
  const isError = !item;
  const name = !item
    ? getEntityNameFromId(id, { removeVersion: true })
    : getLocalizedText(item.name, language, getEntityNameFromId(id, { removeVersion: true }));
  const version = !item ? getVersionFromId(id) : item.version;

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onItemClick?.(id);
    },
    [id, onItemClick],
  );

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRemove(id);
    },
    [id, onRemove],
  );

  return (
    <DialTooltip
      tooltip={
        <ChipTooltipContent id={id} item={item} name={name} version={version} isInSelectionList />
      }
    >
      <div
        className={classNames(
          'flex w-full items-center justify-between gap-3 px-3 py-2 transition-colors',
          'cursor-pointer',
          isError ? 'hover:bg-error' : 'hover:bg-accent-primary-alpha',
        )}
        onClick={handleClick}
      >
        <div className="flex min-w-0 items-center gap-2">
          <ChipTitle name={name} version={version} isError={isError} />
        </div>
        <CloseButtonSmall
          className={classNames(isError && 'hover:enabled:text-error')}
          onClick={handleRemove}
        />
      </div>
    </DialTooltip>
  );
};
