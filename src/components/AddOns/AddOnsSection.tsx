import { FC, memo, useState } from 'react';

import { CommonI18nKeys, QuickAppEditorI18nKeys } from '@/constants/i18n';
import { AgentsAndToolsetsModalQueryParams } from '@/constants/quick-apps';
import type { ConversationStartersValues } from '@/types/conversation-starters';
import type { QuickApp2FormValues } from '@/types/quick-app-form';
import { useSearchParams } from '@/hooks/use-search-params';
import { useTranslation } from '@/hooks/use-translation';
import { DialAppTransportType } from '@/types/quick-apps';
import { Translation } from '@/types/translation';

import AgentSkillsFormSection from '@/components/AgentSkills/AgentSkillsFormSection';
import { AddOnRow } from '@/components/AddOns/AddOnRow';
import { AgentsAndToolsetsField } from '@/components/ContextAndTools/AgentsAndToolsetsField';
import ConversationStartersRow from '@/components/ConversationStarters/ConversationStartersRow';
import { Section } from '@/components/common/Section/Section';

export interface AddOnsSectionProps {
  agentSkills: QuickApp2FormValues['agentSkills'];
  onAgentSkillsChange: (value: QuickApp2FormValues['agentSkills']) => void;
  isReadonly: boolean;
  tooltip?: string;
  agentsAndToolsets: QuickApp2FormValues['agentsAndToolsets'];
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
  agentsAndToolsets,
  onAgentsChange,
  onConfigureAgent,
  conversationStarters,
  onConversationStartersSave,
}) => {
  const { t } = useTranslation(Translation.QuickAppEditor);
  const { t: tCommon } = useTranslation(Translation.Common);
  const searchParams = useSearchParams();

  const [isAgentsModalOpen, setIsAgentsModalOpen] = useState(
    searchParams.get(AgentsAndToolsetsModalQueryParams.Modal) === '1',
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

        <AddOnRow
          label={t(QuickAppEditorI18nKeys.AgentsAndToolsets)}
          emptyDescription={t(QuickAppEditorI18nKeys.ContextAndToolsDescription)}
          isEmpty={agentsAndToolsets.length === 0}
          isAddDisabled={isReadonly}
          addTooltip={tooltip ?? tCommon(CommonI18nKeys.AddAgentsAndToolsets)}
          onAdd={() => setIsAgentsModalOpen(true)}
        >
          <AgentsAndToolsetsField
            agentsAndToolsets={agentsAndToolsets}
            onAgentsChange={onAgentsChange}
            onConfigureAgent={onConfigureAgent}
            readonly={isReadonly}
            isSelectModalOpen={isAgentsModalOpen}
            onSelectModalOpenChange={setIsAgentsModalOpen}
          />
        </AddOnRow>

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
