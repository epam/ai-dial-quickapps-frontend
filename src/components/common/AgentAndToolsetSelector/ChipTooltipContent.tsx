import React, { useMemo } from "react";

import { useTranslation } from "@/hooks/useTranslation";
import { Translation } from "@/types/translation";
import { CommonI18nKeys } from "@/constants/i18n";
import { isToolsetId } from "@/utils/api";
import {
  getEntityStatusMessage,
  type EntityStatus,
} from "@/utils/get-entity-status";

import type { ChipEntity } from "./AgentAndToolsetChip";

interface ChipTooltipContentProps {
  id: string;
  item?: ChipEntity;
  name: string;
  version?: string;
  status?: EntityStatus;
  isInSelectionList?: boolean;
  isCustomTool?: boolean;
  readonly?: boolean;
}

export const ChipTooltipContent: React.FC<ChipTooltipContentProps> = ({
  id,
  item,
  name,
  version,
  status,
  isInSelectionList,
  isCustomTool,
  readonly,
}) => {
  const { t } = useTranslation(Translation.Common);

  const showUnavailable = !item && !isCustomTool;
  const showReadonlyHint = readonly && !isInSelectionList;
  const entityTypeKey = isToolsetId(id)
    ? CommonI18nKeys.ToolsetEntityType
    : CommonI18nKeys.AgentEntityType;

  const statusMessage = useMemo(
    () => getEntityStatusMessage(status, readonly, t),
    [status, readonly, t],
  );

  return (
    <div className="flex max-w-[440px] flex-col px-2 py-1">
      {showUnavailable && (
        <p className="dial-tiny-text mb-1 text-error">
          {t(CommonI18nKeys.NotAvailableEntityTypePleaseChange, {
            entityType: t(entityTypeKey),
          })}
        </p>
      )}
      {statusMessage && (
        <p className="dial-tiny-text mb-1 text-error">{statusMessage}</p>
      )}
      {showReadonlyHint && (
        <p className="dial-tiny-text mb-1 text-secondary">Read-only</p>
      )}
      <div className="flex items-center gap-3">
        <div className="dial-small-text flex min-w-0 flex-1 flex-col">
          <span className="w-full truncate">{name}</span>
          {version && <span className="text-secondary">v{version}</span>}
        </div>
      </div>
    </div>
  );
};
