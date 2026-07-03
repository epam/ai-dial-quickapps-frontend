import React from "react";

import { useTranslation } from "@/hooks/useTranslation";
import { Translation } from "@/types/translation";
import { CommonI18nKeys } from "@/constants/i18n";
import { isToolsetId } from "@/utils/api";
import type { EntityStatus } from "@/utils/get-entity-status";

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

  const statusMessage = (() => {
    if (!status) return undefined;
    if (status.isLoggedOut) {
      // Clicking the chip opens the sign-in popup directly (no scroll target
      // exists in this simplified selector), so always use the "click on" copy.
      return readonly
        ? t(CommonI18nKeys.LoggedOutToolset)
        : t(CommonI18nKeys.LoggedOutToolsetClickOn);
    }
    if (status.isDeploying) return t(CommonI18nKeys.DeployingApp);
    if (status.isUndeploying) return t(CommonI18nKeys.UndeployingApp);
    if (status.isRedeploying) return t(CommonI18nKeys.RedeployingApp);
    // Deploying/undeploying an app isn't an action available from this
    // selector, so never suggest clicking — just report the status.
    if (status.isUndeployed) return t(CommonI18nKeys.UndeployedApp);
    return undefined;
  })();

  return (
    <div className="flex max-w-[440px] flex-col px-2 py-1">
      {showUnavailable && (
        <p className="mb-1 text-xs text-error">
          {t(CommonI18nKeys.NotAvailableEntityTypePleaseChange, {
            entityType: t(entityTypeKey),
          })}
        </p>
      )}
      {statusMessage && (
        <p className="mb-1 text-xs text-error">{statusMessage}</p>
      )}
      {showReadonlyHint && (
        <p className="mb-1 text-xs text-secondary">Read-only</p>
      )}
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col text-sm">
          <span className="w-full truncate">{name}</span>
          {version && <span className="text-secondary">v{version}</span>}
        </div>
      </div>
    </div>
  );
};
