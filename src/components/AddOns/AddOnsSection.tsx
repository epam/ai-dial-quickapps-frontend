import { FC, memo, useMemo } from 'react';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { AddOnSchemaKeys } from '@/form/quickApp2Form';
import type { ConversationStartersValues } from '@/types/conversation-starters';
import type { QuickApp2FormValues } from '@/types/quick-app-form';
import { useAddOnEntityMap } from '@/hooks/use-add-on-entity-map';
import { useTranslation } from '@/hooks/use-translation';
import { DialAppTransportType } from '@/types/quick-apps';
import { Translation } from '@/types/translation';
import { partitionAddOnIds } from '@/utils/get-add-on-kind';

import AgentSkillsFormSection from '@/components/AgentSkills/AgentSkillsFormSection';
import AgentsFormSection from '@/components/Agents/AgentsFormSection/AgentsFormSection';
import ConversationStartersRow from '@/components/ConversationStarters/ConversationStartersRow';
import ToolsetsFormSection from '@/components/Toolsets/ToolsetsFormSection/ToolsetsFormSection';
import { Section } from '@/components/common/Section/Section';

export interface AddOnsSectionProps {
  agentSkills: QuickApp2FormValues['agentSkills'];
  onAgentSkillsChange: (value: QuickApp2FormValues['agentSkills']) => void;
  isReadonly: boolean;
  tooltip?: string;
  addOns: QuickApp2FormValues['addOns'];
  onAgentsChange: (ids: string[]) => void;
  onConfigureAgent: (id: string, transport: DialAppTransportType) => void;
  conversationStarters: ConversationStartersValues;
  onConversationStartersSave: (values: ConversationStartersValues) => void;
}

export const AddOnsSection: FC<AddOnsSectionProps> = ({
  agentSkills,
  onAgentSkillsChange,
  isReadonly,
  tooltip,
  addOns,
  onAgentsChange,
  onConfigureAgent,
  conversationStarters,
  onConversationStartersSave,
}) => {
  const { t } = useTranslation(Translation.QuickAppEditor);
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
    <Section title={t(QuickAppEditorI18nKeys.AddOns)}>
      <div className="flex flex-col gap-7">
        <AgentSkillsFormSection
          value={agentSkills}
          onChange={onAgentSkillsChange}
          isReadonly={isReadonly}
          tooltip={tooltip}
        />

        <ToolsetsFormSection
          allIds={allIds}
          toolsetIds={toolsetIds}
          isReadonly={isReadonly}
          tooltip={tooltip}
          onChange={onAgentsChange}
        />

        <AgentsFormSection
          allIds={allIds}
          agentIds={agentIds}
          isReadonly={isReadonly}
          tooltip={tooltip}
          onChange={onAgentsChange}
          transports={transports}
          onConfigure={onConfigureAgent}
        />

        <ConversationStartersRow
          values={conversationStarters}
          isReadonly={isReadonly}
          tooltip={tooltip}
          onSave={onConversationStartersSave}
        />
      </div>
    </Section>
  );
};

export default memo(AddOnsSection);
