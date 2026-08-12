'use client';
import type { ChipEntity } from '@/components/common/AgentAndToolsetSelector/AgentAndToolsetChip';
import { AgentAndToolsetSelector } from '@/components/common/AgentAndToolsetSelector/AgentAndToolsetSelector';
import { EntityInfoModal } from '@/components/common/AgentAndToolsetSelector/EntityInfoModal';
import { ToggleSwitch } from '@/components/common/ToggleSwitch/ToggleSwitch';
import { CommonI18nKeys, MarketplaceI18nKeys } from '@/constants/i18n';
import { useDataContext } from '@/context/DataContext';
import { useThemeContext } from '@/context/ThemeContext';
import type { QuickApp2Form } from '@/form/quickApp2Form';
import { AgentOrToolsetSchemaKeys } from '@/form/quickApp2Form';
import { useTranslation } from '@/hooks/useTranslation';
import { AnyToolset, DialAppTransportType } from '@/types/quick-apps';
import { ThemeId } from '@/types/theme';
import { Translation } from '@/types/translation';
import { isDialAiEntityModel } from '@/utils/application';
import {
  ButtonVariant,
  ConfirmationPopupVariant,
  DialButton,
  DialConfirmationPopup,
  DialNeutralButton,
  DialNeutralIconButton,
  ElementSize,
  LazyDialJsonEditor,
} from '@epam/ai-dial-ui-kit';
import { IconArrowsMaximize, IconArrowsMinimize } from '@tabler/icons-react';
import sortBy from 'lodash-es/sortBy';
import dynamic from 'next/dynamic';
import { FC, useCallback, useMemo, useState } from 'react';
import { DialAppConfigurationModal } from './DialAppConfigurationModal';

const DialJsonEditor = dynamic(async () => (await LazyDialJsonEditor()).DialJsonEditor, {
  ssr: false,
});
interface AgentsAndToolsetsFieldProps {
  agentsAndToolsets: QuickApp2Form['agentsAndToolsets'];
  agentsAndToolsetsJson: string;
  isJsonView: boolean;
  onAgentsChange: (ids: string[]) => void;
  onJsonChange: (json: string) => void;
  onSwitchToJsonView: () => void;
  onSwitchToSimpleView: (toolsets: AnyToolset[]) => void;
  onDiscardJson: () => void;
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
  onSwitchToJsonView,
  onSwitchToSimpleView,
  onDiscardJson,
  onConfigureAgent,
  readonly,
  tooltip,
  jsonError,
}) => {
  const { t } = useTranslation(Translation.Marketplace);
  const { currentTheme } = useThemeContext();
  const editorMonacoTheme = currentTheme?.id === ThemeId.Light ? 'light' : 'vs-dark';
  const { modelsMap, toolsetsMap, mcpAgentsMap } = useDataContext();

  const [editorError, setEditorError] = useState<string | undefined>(undefined);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);
  const [configuringChip, setConfiguringChip] = useState<{
    id: string;
    transport?: DialAppTransportType;
  } | null>(null);
  const [viewingItem, setViewingItem] = useState<ChipEntity | null>(null);

  const allItemsMap: Record<string, ChipEntity | undefined> = useMemo(
    () => ({
      ...modelsMap,
      ...toolsetsMap,
      ...mcpAgentsMap,
    }),
    [modelsMap, toolsetsMap, mcpAgentsMap],
  );

  const selectedIds = useMemo(
    () =>
      sortBy(
        agentsAndToolsets.map((a) => a[AgentOrToolsetSchemaKeys.id]),
        [(id) => (allItemsMap[id]?.name ?? id).toLowerCase()],
      ),
    [agentsAndToolsets, allItemsMap],
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
        onSwitchToSimpleView(parsed as AnyToolset[]);
      } catch {
        setEditorError(t(CommonI18nKeys.ShouldBeAValidJSON));
      }
    } else {
      onSwitchToJsonView();
    }
  }, [isJsonView, agentsAndToolsetsJson, onSwitchToSimpleView, onSwitchToJsonView, t]);

  const handleDiscardConfirm = useCallback(() => {
    setEditorError(undefined);
    setIsFullscreen(false);
    setIsDiscardConfirmOpen(false);
    onDiscardJson();
  }, [onDiscardJson]);

  const handleItemClick = useCallback(
    (id: string) => {
      const item = allItemsMap[id];
      if (item) setViewingItem(item);
    },
    [allItemsMap],
  );

  const handleConfigureClick = useCallback(
    (item: ChipEntity) => {
      if (!isDialAiEntityModel(item)) return;
      const existing = agentsAndToolsets.find((a) => a[AgentOrToolsetSchemaKeys.id] === item.id);
      const tool = existing?.[AgentOrToolsetSchemaKeys.tool] as
        { transport?: DialAppTransportType } | undefined;
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
              additionalText={t(MarketplaceI18nKeys.JSONLabel)}
              className="flex w-fit items-center gap-2"
              tooltip={readonly ? tooltip : t(MarketplaceI18nKeys.SwitchToMarketplaceView)}
            />
            <DialNeutralIconButton
              size={ElementSize.Small}
              icon={
                isFullscreen ? <IconArrowsMinimize size={16} /> : <IconArrowsMaximize size={16} />
              }
              onClick={() => setIsFullscreen((prev) => !prev)}
            />
          </div>
          <div
            className={
              isFullscreen
                ? 'fixed inset-0 z-50 flex flex-col gap-2 bg-layer-2 p-4'
                : 'flex flex-col gap-2'
            }
          >
            {isFullscreen && (
              <div className="flex items-center justify-end">
                <DialNeutralIconButton
                  size={ElementSize.Small}
                  icon={<IconArrowsMinimize size={16} />}
                  onClick={() => setIsFullscreen(false)}
                />
              </div>
            )}
            <div style={{ height: isFullscreen ? 'calc(100% - 80px)' : '300px' }}>
              <DialJsonEditor
                value={agentsAndToolsetsJson}
                onChange={(val) => onJsonChange(val ?? '')}
                currentTheme={editorMonacoTheme}
                options={{ readOnly: readonly, automaticLayout: true }}
              />
            </div>
            {(editorError ?? jsonError) && (
              <p className="dial-tiny-text text-error">{editorError ?? jsonError}</p>
            )}
            {!readonly && (
              <div className="flex justify-end gap-2">
                <DialNeutralButton
                  size={ElementSize.Small}
                  onClick={() => setIsDiscardConfirmOpen(true)}
                  label={t(MarketplaceI18nKeys.DiscardMarketplace)}
                />
                <DialButton
                  variant={ButtonVariant.Primary}
                  size={ElementSize.Small}
                  onClick={handleJsonSwitchClick}
                  label={t(MarketplaceI18nKeys.SaveJSON)}
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        <AgentAndToolsetSelector
          value={selectedIds}
          onChange={handleAgentsChange}
          readonly={readonly}
          allItemsMap={allItemsMap}
          tooltip={tooltip}
          onItemClick={handleItemClick}
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

      {viewingItem && (
        <EntityInfoModal item={viewingItem} onClose={() => setViewingItem(null)} />
      )}

      <DialConfirmationPopup
        variant={ConfirmationPopupVariant.Danger}
        open={isDiscardConfirmOpen}
        header={t(MarketplaceI18nKeys.DiscardChanges)}
        description={t(MarketplaceI18nKeys.DiscardJsonChangesConfirmation)}
        confirmLabel={t(MarketplaceI18nKeys.DiscardMarketplace)}
        cancelLabel={t(MarketplaceI18nKeys.ContinueEditing)}
        onConfirm={handleDiscardConfirm}
        onCancel={() => setIsDiscardConfirmOpen(false)}
        onClose={() => setIsDiscardConfirmOpen(false)}
      />
    </div>
  );
};
