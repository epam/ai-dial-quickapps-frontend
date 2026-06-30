import { IconApps, IconSettings, IconTool } from '@tabler/icons-react';
import React, { useMemo } from 'react';

import classNames from 'classnames';

import { isApplicationId, isToolsetId, getEntityNameFromId, getVersionFromId } from '@/utils/api';
import { doesAgentSupportMcp } from '@/utils/application';

import { ChipTooltipContent } from './ChipTooltipContent';

import {
  DialGhostIconButton,
  DialTag,
  DialTooltip,
  ElementSize,
} from '@epam/ai-dial-ui-kit';

export interface ChipEntity {
  id: string;
  name?: string;
  version?: string;
  type?: string;
  mcp?: boolean;
  features?: { mcp?: boolean };
  applicationTypeSchemaId?: string;
  [key: string]: unknown;
}

const EntityIcon: React.FC<{ id: string; size?: number }> = ({
  id,
  size = 18,
}) => {
  if (isApplicationId(id)) return <IconApps size={size} stroke={1.5} />;
  if (isToolsetId(id)) return <IconTool size={size} stroke={1.5} />;
  return <IconApps size={size} stroke={1.5} />;
};

interface ChipConfigureButtonProps {
  item?: ChipEntity;
  onConfigure?: (item: ChipEntity) => void;
}

const ChipConfigureButton: React.FC<ChipConfigureButtonProps> = ({
  item,
  onConfigure,
}) => {
  const isConfigurableApp = item && doesAgentSupportMcp(item) && !!onConfigure;

  if (!isConfigurableApp) return null;

  return (
    <DialGhostIconButton
      name="Configure"
      icon={<IconSettings size={16} stroke={1.5} />}
      size={ElementSize.Small}
      className="invisible absolute end-[30px] top-1/2 -translate-y-1/2 group-hover:visible"
      onClick={() => onConfigure?.(item)}
    />
  );
};

interface AgentAndToolsetChipProps {
  id: string;
  item?: ChipEntity;
  onRemove?: (id: string) => void;
  readonly?: boolean;
  onItemClick?: (id: string) => void;
  onConfigure?: (item: ChipEntity) => void;
  isInSelectionList?: boolean;
}

export const AgentAndToolsetChip: React.FC<AgentAndToolsetChipProps> = ({
  id,
  item,
  onRemove,
  readonly,
  onItemClick,
  onConfigure,
  isInSelectionList,
}) => {
  const isError = !item;

  const name = !item
    ? getEntityNameFromId(id, { removeVersion: true })
    : (item.name ?? getEntityNameFromId(id, { removeVersion: true }));

  const isCustomTool = !isApplicationId(id) && !isToolsetId(id) && !item;

  const version = isCustomTool
    ? ''
    : !item
      ? getVersionFromId(id)
      : item.version;

  const tooltipContent = useMemo(
    () => (
      <ChipTooltipContent
        id={id}
        item={item}
        name={name}
        version={version}
        isInSelectionList={isInSelectionList}
        isCustomTool={isCustomTool}
        readonly={readonly}
      />
    ),
    [id, item, name, version, isInSelectionList, readonly, isCustomTool],
  );

  const handleRemove = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onRemove?.(id);
  };

  const handleClick = (_e: React.MouseEvent<HTMLDivElement>) => {
    if (!readonly) onItemClick?.(id);
  };

  return (
    <div className="group relative" data-qa="agent-chip">
      <DialTooltip tooltip={tooltipContent}>
        <DialTag
          label={name}
          icon={<EntityIcon id={id} />}
          closable={!readonly}
          onRemove={handleRemove}
          onClick={onItemClick ? handleClick : undefined}
          className={classNames(
            isCustomTool && 'bg-layer-4',
            isError && 'bg-error',
          )}
        />
      </DialTooltip>
      {!readonly && <ChipConfigureButton item={item} onConfigure={onConfigure} />}
    </div>
  );
};
