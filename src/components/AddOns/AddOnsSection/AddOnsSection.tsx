import { FC, memo, useMemo } from 'react';

import { ApplicationEditorI18nKeys } from '@/constants/translation-keys';
import { AddOnSchemaKeys } from '@/types/quick-app-form';
import type { ConversationStartersValues } from '@/types/conversation-starters';
import type { QuickApp2FormValues } from '@/types/quick-app-form';
import { useAddOnEntityMap } from '@/hooks/use-add-on-entity-map';
import { useTranslation } from 'react-i18next';
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
  isReadonly: boolean;
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
  isReadonly,
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
  const { toolsetIds, agentIds } = useMemo(
    () => partitionAddOnIds(addOns, entityMap),
    [addOns, entityMap],
  );

  return (
    <Section title={t(ApplicationEditorI18nKeys.AddOnsTitle)}>
      <div className="flex flex-col gap-7">
        <AgentSkillsFormSection
          value={agentSkills}
          onChange={onAgentSkillsChange}
          isReadonly={isReadonly}
        />

        <ToolsetsFormSection
          allIds={allIds}
          toolsetIds={toolsetIds}
          isReadonly={isReadonly}
          onChange={onAgentsChange}
        />

        <AgentsFormSection
          allIds={allIds}
          agentIds={agentIds}
          isReadonly={isReadonly}
          onChange={onAgentsChange}
          transports={transports}
          onConfigure={onConfigureAgent}
        />

        <KnowledgeBaseRow
          files={documentRelativeUrl}
          isReadonly={isReadonly}
          onAddFiles={onAddDocuments}
          onRemoveFile={onRemoveDocument}
        />

        <ConversationStartersRow
          values={conversationStarters}
          isReadonly={isReadonly}
          onSave={onConversationStartersSave}
        />
      </div>
    </Section>
  );
};

export default memo(AddOnsSection);
