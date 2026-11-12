import { FC, memo, useCallback, useMemo } from 'react';

import { ApplicationEditorI18nKeys } from '@/constants/translation-keys';
import { AddOnSchemaKeys } from '@/types/quick-app-form';
import type { ConversationStartersValues } from '@/types/conversation-starters';
import type { QuickApp2FormValues } from '@/types/quick-app-form';
import { useDataContext } from '@/context/DataContext';
import { useAddOnEntityMap } from '@/hooks/use-add-on-entity-map';
import { useTranslation } from 'react-i18next';
import { DialEntityType } from '@/types/dial-entities';
import { doesAgentSupportMcp } from '@/utils/application';
import { DialAppTransportType } from '@/types/quick-apps';
import { partitionAddOnIds } from '@/utils/get-add-on-kind';

import AgentSkillsFormSection from '@/components/AgentSkills/AgentSkillsFormSection/AgentSkillsFormSection';
import AgentsFormSection from '@/components/Agents/AgentsFormSection/AgentsFormSection';
import ConversationStartersRow from '@/components/ConversationStarters/ConversationStartersRow/ConversationStartersRow';
import KnowledgeBaseRow from '@/components/KnowledgeBase/KnowledgeBaseRow/KnowledgeBaseRow';
import ToolsetsFormSection from '@/components/Toolsets/ToolsetsFormSection/ToolsetsFormSection';
import { Section } from '@/components/common/Section/Section';

export interface AddOnsSectionProps {
  agentSkills: QuickApp2FormValues['agentSkills'];
  onAgentSkillsChange: (value: QuickApp2FormValues['agentSkills']) => void;
  addOns: QuickApp2FormValues['addOns'];
  onAgentsChange: (ids: string[]) => void;
  onConfigureAgent: (id: string, transport: DialAppTransportType) => void;
  documentRelativeUrl: QuickApp2FormValues['documentRelativeUrl'];
  onAddDocuments: (documents: string[]) => void;
  onRemoveDocument: (document: string) => void;
  conversationStarters: ConversationStartersValues;
  onConversationStartersSave: (values: ConversationStartersValues) => void;
}

export const AddOnsSection: FC<AddOnsSectionProps> = ({
  agentSkills,
  onAgentSkillsChange,
  addOns,
  onAgentsChange,
  onConfigureAgent,
  documentRelativeUrl,
  onAddDocuments,
  onRemoveDocument,
  conversationStarters,
  onConversationStartersSave,
}) => {
  const { t } = useTranslation();
  const entityMap = useAddOnEntityMap();
  const { mcpAgentsMap } = useDataContext();
  // `mcpAgents` holds only the applications with no chat interface.
  const mcpOnlyAgentIds = useMemo(() => new Set(Object.keys(mcpAgentsMap)), [mcpAgentsMap]);

  // Toolsets and Agents both edit `addOns`: each row shows its own
  // entries and always hands back the full id list, so the other row's
  // entries (and their tool data) stay where they are.
  const allIds = useMemo(() => addOns.map((entry) => entry[AddOnSchemaKeys.id]), [addOns]);
  const transports = useMemo(
    () =>
      Object.fromEntries(
        addOns.map((entry) => [
          entry[AddOnSchemaKeys.id],
          (entry[AddOnSchemaKeys.tool] as { transport?: DialAppTransportType } | undefined)
            ?.transport,
        ]),
      ),
    [addOns],
  );
  // The saved config of every entry, so a toolset defined inline in the JSON can show its tools.
  const inlineConfigs = useMemo(
    () =>
      Object.fromEntries(
        addOns.flatMap((entry) => {
          const config = entry[AddOnSchemaKeys.tool];
          return config == null ? [] : [[entry[AddOnSchemaKeys.id], config]];
        }),
      ),
    [addOns],
  );
  const { toolsetIds, agentIds } = useMemo(
    () => partitionAddOnIds(addOns, entityMap, mcpOnlyAgentIds),
    [addOns, entityMap, mcpOnlyAgentIds],
  );

  // A new MCP-capable application is saved with the transport of the popup it
  // was added from: `mcp` as a tool, `chat-completion` as an agent. MCP-only
  // applications have no chat transport, so they always get `mcp`.
  const handleChange = useCallback(
    (ids: string[], transport: DialAppTransportType, switchedIds: string[] = []) => {
      onAgentsChange(ids);
      const knownIds = new Set(allIds);
      // New entries, and entries moved here from the other row, get this row's transport.
      ids
        .filter((id) => !knownIds.has(id) || switchedIds.includes(id))
        .forEach((id) => {
          const entity = entityMap[id];
          if (entity?.type !== DialEntityType.Application || !doesAgentSupportMcp(entity)) return;
          const isChatCapable = !mcpOnlyAgentIds.has(id);
          onConfigureAgent(id, isChatCapable ? transport : DialAppTransportType.MCP);
        });
    },
    [allIds, entityMap, mcpOnlyAgentIds, onAgentsChange, onConfigureAgent],
  );
  const handleToolsetsChange = useCallback(
    (ids: string[], switchedIds?: string[]) =>
      handleChange(ids, DialAppTransportType.MCP, switchedIds),
    [handleChange],
  );
  const handleAgentsChange = useCallback(
    (ids: string[], switchedIds?: string[]) =>
      handleChange(ids, DialAppTransportType.ChatCompletion, switchedIds),
    [handleChange],
  );

  return (
    <Section title={t(ApplicationEditorI18nKeys.AddOnsTitle)}>
      <div className="flex flex-col gap-7">
        <AgentSkillsFormSection value={agentSkills} onChange={onAgentSkillsChange} />

        <ToolsetsFormSection
          allIds={allIds}
          toolsetIds={toolsetIds}
          inlineConfigs={inlineConfigs}
          onChange={handleToolsetsChange}
        />

        <AgentsFormSection
          allIds={allIds}
          agentIds={agentIds}
          onChange={handleAgentsChange}
          transports={transports}
          onConfigure={onConfigureAgent}
        />

        <KnowledgeBaseRow
          files={documentRelativeUrl}
          onAddFiles={onAddDocuments}
          onRemoveFile={onRemoveDocument}
        />

        <ConversationStartersRow
          values={conversationStarters}
          onSave={onConversationStartersSave}
        />
      </div>
    </Section>
  );
};

export default memo(AddOnsSection);
