"use client";
import { FC, useCallback, useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { Translation } from "@/types/translation";
import { CommonI18nKeys, MarketplaceI18nKeys } from "@/constants/i18n";
import { useDataContext } from "@/context/DataContext";
import { AgentOrToolsetSchemaKeys } from "@/form/quickApp2Form";
import type { QuickApp2Form } from "@/form/quickApp2Form";
import { DialAppTransportType } from "@/types/quick-apps";
import { isApplicationId } from "@/utils/api";
import { doesAgentSupportMcp } from "@/utils/application";
import { AgentAndToolsetSelector } from "@/components/common/AgentAndToolsetSelector/AgentAndToolsetSelector";
import { DialAppConfigurationModal } from "./DialAppConfigurationModal";
import { MonacoEditor } from "@/components/common/MonacoEditor";
import type { ChipEntity } from "@/components/common/AgentAndToolsetSelector/AgentAndToolsetChip";
import { ToggleSwitch } from "@/components/common/ToggleSwitch/ToggleSwitch";
import { ButtonVariant, DialButton } from "@epam/ai-dial-ui-kit";
import classNames from "classnames";

interface AgentsAndToolsetsFieldProps {
  agentsAndToolsets: QuickApp2Form["agentsAndToolsets"];
  agentsAndToolsetsJson: string;
  isJsonView: boolean;
  onAgentsChange: (ids: string[]) => void;
  onJsonChange: (json: string) => void;
  onJsonViewChange: (isJson: boolean) => void;
  onConfigureAgent: (id: string, transport: DialAppTransportType) => void;
  readonly?: boolean;
  tooltip?: string;
  jsonError?: string;
}

export const AgentsAndToolsetsField: FC<AgentsAndToolsetsFieldProps> = ({
  agentsAndToolsets,
  agentsAndToolsetsJson,
  isJsonView,
  onAgentsChange,
  onJsonChange,
  onJsonViewChange,
  onConfigureAgent,
  readonly,
  tooltip,
  jsonError,
}) => {
  const { t } = useTranslation(Translation.Marketplace);
  const { modelsMap, toolsetsMap } = useDataContext();

  const [editorError, setEditorError] = useState<string | undefined>(undefined);
  const [configuringChip, setConfiguringChip] = useState<{
    id: string;
    transport?: DialAppTransportType;
  } | null>(null);

  const allItemsMap: Record<string, ChipEntity | undefined> = {
    ...modelsMap,
    ...toolsetsMap,
  };

  const selectedIds = agentsAndToolsets.map(
    (a) => a[AgentOrToolsetSchemaKeys.id],
  );

  const handleAgentsChange = useCallback(
    (ids: string[]) => {
      onAgentsChange(ids);
    },
    [onAgentsChange],
  );

  const handleJsonSwitchClick = useCallback(() => {
    if (isJsonView) {
      // Try to switch back to UI view — validate JSON first
      try {
        const parsed = JSON.parse(agentsAndToolsetsJson);
        if (!Array.isArray(parsed)) {
          setEditorError(t(CommonI18nKeys.ShouldBeAnArray));
          return;
        }
        setEditorError(undefined);
        onJsonViewChange(false);
      } catch {
        setEditorError(t(CommonI18nKeys.ShouldBeAValidJSON));
      }
    } else {
      onJsonViewChange(true);
    }
  }, [isJsonView, agentsAndToolsetsJson, onJsonViewChange, t]);

  const handleConfigureClick = useCallback(
    (item: ChipEntity) => {
      if (!isApplicationId(item.id)) return;
      const existing = agentsAndToolsets.find(
        (a) => a[AgentOrToolsetSchemaKeys.id] === item.id,
      );
      const tool = existing?.[AgentOrToolsetSchemaKeys.tool] as
        | { transport?: DialAppTransportType }
        | undefined;
      setConfiguringChip({ id: item.id, transport: tool?.transport });
    },
    [agentsAndToolsets],
  );

  const handleConfigureSave = useCallback(
    (transport: DialAppTransportType) => {
      if (!configuringChip) return;
      onConfigureAgent(configuringChip.id, transport);
      setConfiguringChip(null);
    },
    [configuringChip, onConfigureAgent],
  );

  return (
    <div className="flex flex-col gap-2">
      {isJsonView ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-end gap-2">
            <ToggleSwitch
              isOn={true}
              handleSwitch={handleJsonSwitchClick}
              disabled={readonly}
              switchOFFText={t(MarketplaceI18nKeys.OnToggle)}
              additionalText={t(MarketplaceI18nKeys.JSONLabel)}
              className="flex w-fit items-center gap-2"
              tooltip={
                readonly
                  ? tooltip
                  : t(MarketplaceI18nKeys.SwitchToMarketplaceView)
              }
            />
          </div>
          <MonacoEditor
            value={agentsAndToolsetsJson}
            onChange={(val) => onJsonChange(val ?? "")}
            language="json"
            height={300}
            options={{ readOnly: readonly }}
          />
          {(editorError ?? jsonError) && (
            <p className="text-xs text-error">{editorError ?? jsonError}</p>
          )}
          {!readonly && (
            <div className="flex justify-end gap-2">
              <DialButton
                variant={ButtonVariant.Neutral}
                onClick={() => {
                  setEditorError(undefined);
                  onJsonViewChange(false);
                }}
                label={t(MarketplaceI18nKeys.DiscardMarketplace)}
              />
              <DialButton
                variant={ButtonVariant.Primary}
                onClick={handleJsonSwitchClick}
                label={t(MarketplaceI18nKeys.SaveJSON)}
              />
            </div>
          )}
        </div>
      ) : (
        <AgentAndToolsetSelector
          value={selectedIds}
          onChange={handleAgentsChange}
          readonly={readonly}
          allItemsMap={allItemsMap}
          tooltip={tooltip}
          onJsonSwitchClick={handleJsonSwitchClick}
          onConfigureClick={handleConfigureClick}
        />
      )}

      {configuringChip && (
        <DialAppConfigurationModal
          key={configuringChip.id}
          agentId={configuringChip.id}
          transport={configuringChip.transport}
          onClose={() => setConfiguringChip(null)}
          onSave={handleConfigureSave}
        />
      )}
    </div>
  );
};
