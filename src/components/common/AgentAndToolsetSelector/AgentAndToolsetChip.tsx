import { IconApps, IconSettings, IconTool } from '@tabler/icons-react';
import React, { useMemo } from 'react';

import classNames from 'classnames';

import type {
  ApplicationStatus,
  ToolsetAuthSettings,
} from '@/types/dial-entities';
import { ToolsetAuthType } from '@/types/dial-entities';
import { isApplicationId, isToolsetId, getEntityNameFromId, getVersionFromId } from '@/utils/api';
import { doesAgentSupportMcp } from '@/utils/application';
import { getEntityStatus } from '@/utils/get-entity-status';

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
  functionStatus?: ApplicationStatus;
  authSettings?: ToolsetAuthSettings;
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
  onClick: () => void;
}

const ChipConfigureButton: React.FC<ChipConfigureButtonProps> = ({
  onClick,
}) => (
  <DialGhostIconButton
    name="Configure"
    icon={<IconSettings size={16} stroke={1.5} />}
    size={ElementSize.Small}
    className="invisible absolute end-1 top-1/2 -translate-y-1/2 group-hover:visible"
    onClick={onClick}
  />
);

interface AgentAndToolsetChipProps {
  id: string;
  item?: ChipEntity;
  onRemove?: (id: string) => void;
  readonly?: boolean;
  onItemClick?: (id: string) => void;
  onConfigure?: (item: ChipEntity) => void;
  onLoginToolset?: (item: ChipEntity) => void;
  isInSelectionList?: boolean;
}

export const AgentAndToolsetChip: React.FC<AgentAndToolsetChipProps> = ({
  id,
  item,
  onRemove,
  readonly,
  onItemClick,
  onConfigure,
  onLoginToolset,
  isInSelectionList,
}) => {
  const status = getEntityStatus(item);

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
        status={status}
        isInSelectionList={isInSelectionList}
        isCustomTool={isCustomTool}
        readonly={readonly}
      />
    ),
    [id, item, name, version, status, isInSelectionList, readonly, isCustomTool],
  );

  const hasAuthSettings =
    !!item?.authSettings &&
    item.authSettings.authenticationType !== ToolsetAuthType.None;
  const canOpenLoginModal = hasAuthSettings && !!onLoginToolset && !!item;

  const isConfigurableApp =
    !!item &&
    isApplicationId(item.id) &&
    doesAgentSupportMcp(item) &&
    !!onConfigure;
  const isConfigurable = isConfigurableApp || canOpenLoginModal;

  const handleRemove = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onRemove?.(id);
  };

  const handleClick = (_e: React.MouseEvent<HTMLDivElement>) => {
    if (readonly) return;
    if (canOpenLoginModal) {
      onLoginToolset?.(item as ChipEntity);
      return;
    }
    onItemClick?.(id);
  };

  const handleConfigureClick = () => {
    if (isConfigurableApp) {
      onConfigure?.(item as ChipEntity);
      return;
    }
    if (canOpenLoginModal) {
      onLoginToolset?.(item as ChipEntity);
    }
  };

  return (
    <div className="group relative">
      <DialTooltip tooltip={tooltipContent}>
        <DialTag
          label={name}
          icon={<EntityIcon id={id} />}
          closable={!readonly}
          onRemove={handleRemove}
          onClick={onItemClick || canOpenLoginModal ? handleClick : undefined}
          className={classNames(
            isCustomTool && 'bg-layer-4',
            status.isError && 'bg-error',
            !readonly && isConfigurable && 'group-hover:pe-8',
          )}
        />
      </DialTooltip>
      {!readonly && isConfigurable && (
        <ChipConfigureButton onClick={handleConfigureClick} />
      )}
    </div>
  );
};
