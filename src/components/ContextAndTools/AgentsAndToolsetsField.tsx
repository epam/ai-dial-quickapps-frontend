import type { ChipEntity } from '@/components/common/AgentAndToolsetSelector/AgentAndToolsetChip';
import { AgentAndToolsetSelector } from '@/components/common/AgentAndToolsetSelector/AgentAndToolsetSelector';
import { EntityInfoModal } from '@/components/common/AgentAndToolsetSelector/EntityInfoModal';
import { useDataContext } from '@/context/DataContext';
import type { QuickApp2Form } from '@/form/quickApp2Form';
import { AgentOrToolsetSchemaKeys } from '@/form/quickApp2Form';
import { useTranslation } from '@/hooks/useTranslation';
import { DialAppTransportType } from '@/types/quick-apps';
import { Translation } from '@/types/translation';
import { isDialAiEntityModel } from '@/utils/application';
import { getLocalizedText } from '@/utils/get-localized-text';
import sortBy from 'lodash-es/sortBy';
import { FC, useCallback, useMemo, useState } from 'react';
import { DialAppConfigurationModal } from './DialAppConfigurationModal';

interface AgentsAndToolsetsFieldProps {
  agentsAndToolsets: QuickApp2Form['agentsAndToolsets'];
  onAgentsChange: (ids: string[]) => void;
  onConfigureAgent: (id: string, transport: DialAppTransportType) => void;
  readonly?: boolean;
  isSelectModalOpen: boolean;
  onSelectModalOpenChange: (isOpen: boolean) => void;
}

export const AgentsAndToolsetsField: FC<AgentsAndToolsetsFieldProps> = ({
  agentsAndToolsets,
  onAgentsChange,
  onConfigureAgent,
  readonly,
  isSelectModalOpen,
  onSelectModalOpenChange,
}) => {
  const { language } = useTranslation(Translation.QuickAppEditor);
  const { modelsMap, toolsetsMap, mcpAgentsMap } = useDataContext();

  const [configuringChip, setConfiguringChip] = useState<{
    id: string;
    transport?: DialAppTransportType;
  } | null>(null);
  const [viewingItem, setViewingItem] = useState<ChipEntity | null>(null);

  const allItemsMap: Record<string, ChipEntity | undefined> = useMemo(() => {
    const map: Record<string, ChipEntity | undefined> = {
      ...modelsMap,
      ...toolsetsMap,
      ...mcpAgentsMap,
    };
    // Existing apps may contain inline toolset configs with no deployment_id
    // (previously added via the removed JSON editor) — the chip id for those is
    // the toolset `name` from the config. Index toolsets by display name as
    // well so those chips resolve against the toolset list from context
    // (details, auth status, sign-in) instead of reporting the toolset as not
    // available. Id-keyed entries always win; the first toolset wins on a
    // display-name collision.
    for (const toolset of Object.values(toolsetsMap)) {
      const displayName = getLocalizedText(toolset.name, language, toolset.id);
      if (displayName && !(displayName in map)) {
        map[displayName] = toolset;
      }
    }
    return map;
  }, [modelsMap, toolsetsMap, mcpAgentsMap, language]);

  const selectedIds = useMemo(
    () =>
      sortBy(
        agentsAndToolsets.map((a) => a[AgentOrToolsetSchemaKeys.id]),
        [(id) => getLocalizedText(allItemsMap[id]?.name, language, id).toLowerCase()],
      ),
    [agentsAndToolsets, allItemsMap, language],
  );

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
      <AgentAndToolsetSelector
        value={selectedIds}
        onChange={onAgentsChange}
        readonly={readonly}
        allItemsMap={allItemsMap}
        isSelectModalOpen={isSelectModalOpen}
        onSelectModalOpenChange={onSelectModalOpenChange}
        onItemClick={handleItemClick}
        onConfigureClick={handleConfigureClick}
      />

      {configuringChip && (
        <DialAppConfigurationModal
          key={configuringChip.id}
          agentId={configuringChip.id}
          transport={configuringChip.transport}
          onClose={() => setConfiguringChip(null)}
          onSave={handleConfigureSave}
        />
      )}

      {viewingItem && <EntityInfoModal item={viewingItem} onClose={() => setViewingItem(null)} />}
    </div>
  );
};
