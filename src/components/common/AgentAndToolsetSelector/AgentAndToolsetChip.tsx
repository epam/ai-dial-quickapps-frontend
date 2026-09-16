import { IconApps, IconSettings, IconTool } from '@tabler/icons-react';
import React, { useMemo } from 'react';

import type { ApplicationStatus, LocalizedText, ToolsetAuthSettings } from '@/types/dial-entities';
import { ToolsetAuthType } from '@/types/dial-entities';
import { Translation } from '@/types/translation';
import { getEntityNameFromId, getVersionFromId, isToolsetId } from '@/utils/api';
import { doesAgentSupportMcp, isDialAiEntityModel } from '@/utils/application';
import { getEntityStatus } from '@/utils/get-entity-status';
import { getLocalizedText } from '@/utils/get-localized-text';
import { useTranslation } from '@/hooks/useTranslation';

import { ChipTooltipContent } from './ChipTooltipContent';

import {
  DialGhostIconButton,
  DialTag,
  DialTooltip,
  ElementSize,
  mergeClasses,
} from '@epam/ai-dial-ui-kit';

export interface ChipEntity {
  id: string;
  name?: LocalizedText;
  version?: string;
  type?: string;
  mcp?: boolean;
  features?: { mcp?: boolean };
  applicationTypeSchemaId?: string;
  functionStatus?: ApplicationStatus;
  authSettings?: ToolsetAuthSettings;
  updatedAt?: string | number;
  isUserFavorite?: boolean;
  isStarred?: boolean;
  [key: string]: unknown;
}

const EntityIcon: React.FC<{ id: string; type?: string; size?: number }> = ({
  id,
  type,
  size = 18,
}) => {
  if (type === 'toolset' || (!type && isToolsetId(id))) return <IconTool size={size} stroke={1.5} />;
  return <IconApps size={size} stroke={1.5} />;
};

interface ChipConfigureButtonProps {
  onClick: () => void;
}

const ChipConfigureButton: React.FC<ChipConfigureButtonProps> = ({ onClick }) => (
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
  const { language } = useTranslation(Translation.Common);
  const status = getEntityStatus(item, id);

  const name = !item
    ? getEntityNameFromId(id, { removeVersion: true })
    : getLocalizedText(item.name, language, getEntityNameFromId(id, { removeVersion: true }));

  const version = !item ? getVersionFromId(id) : item.version;

  const tooltipContent = useMemo(
    () => (
      <ChipTooltipContent
        id={id}
        item={item}
        name={name}
        version={version}
        status={status}
        isInSelectionList={isInSelectionList}
        readonly={readonly}
      />
    ),
    [id, item, name, version, status, isInSelectionList, readonly],
  );

  const hasAuthSettings =
    !!item?.authSettings && item.authSettings.authenticationType !== ToolsetAuthType.None;
  const canOpenLoginModal = hasAuthSettings && !!onLoginToolset && !!item;

  const isConfigurableApp =
    !readonly && !!item && isDialAiEntityModel(item) && doesAgentSupportMcp(item) && !!onConfigure;
  const isConfigurable = isConfigurableApp || canOpenLoginModal;

  const handleRemove = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onRemove?.(id);
  };

  const handleClick = () => {
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
          icon={<EntityIcon id={id} type={item?.type} />}
          closable={!readonly}
          onRemove={handleRemove}
          onClick={onItemClick || canOpenLoginModal ? handleClick : undefined}
          className={mergeClasses(
            status.isMissingDeploymentId ? 'bg-layer-sunken' : status.isError && 'bg-error',
            !readonly && isConfigurable && 'group-hover:pe-8',
          )}
        />
      </DialTooltip>
      {!readonly && isConfigurable && <ChipConfigureButton onClick={handleConfigureClick} />}
    </div>
  );
};
