import React from "react";

import type { ChipEntity } from "./AgentAndToolsetChip";

interface ChipTooltipContentProps {
  id: string;
  item?: ChipEntity;
  name: string;
  version?: string;
  isInSelectionList?: boolean;
  isCustomTool?: boolean;
  readonly?: boolean;
}

export const ChipTooltipContent: React.FC<ChipTooltipContentProps> = ({
  item,
  name,
  version,
  isInSelectionList,
  isCustomTool,
  readonly,
}) => {
  const showUnavailable = !item && !isCustomTool;
  const showReadonlyHint = readonly && !isInSelectionList;

  return (
    <div className="flex max-w-[440px] flex-col px-2 py-1">
      {showUnavailable && (
        <p className="mb-1 text-xs text-error">Not available</p>
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
