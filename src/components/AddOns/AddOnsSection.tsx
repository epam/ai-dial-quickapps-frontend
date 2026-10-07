import { FC, memo, useState } from 'react';
import { Control } from 'react-hook-form';

import { CommonI18nKeys, QuickAppEditorI18nKeys } from '@/constants/i18n';
import { AgentsAndToolsetsModalQueryParams } from '@/constants/quick-apps';
import { QuickApp2Form as QuickApp2FormType } from '@/form/quickApp2Form';
import { useSearchParams } from '@/hooks/useSearchParams';
import { useTranslation } from '@/hooks/useTranslation';
import { DialAppTransportType } from '@/types/quick-apps';
import { Translation } from '@/types/translation';

import AgentSkillsFormSection from '@/components/AgentSkills/AgentSkillsFormSection';
import { AddOnRow } from '@/components/AddOns/AddOnRow';
import { AgentsAndToolsetsField } from '@/components/ContextAndTools/AgentsAndToolsetsField';
import { Section } from '@/components/common/Section/Section';

export interface AddOnsSectionProps {
  control: Control<QuickApp2FormType>;
  isReadonly: boolean;
  tooltip?: string;
  agentsAndToolsets: QuickApp2FormType['agentsAndToolsets'];
  onAgentsChange: (ids: string[]) => void;
  onConfigureAgent: (id: string, transport: DialAppTransportType) => void;
}

export const AddOnsSection: FC<AddOnsSectionProps> = ({
  control,
  isReadonly,
  tooltip,
  agentsAndToolsets,
  onAgentsChange,
  onConfigureAgent,
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
        <AgentSkillsFormSection control={control} isReadonly={isReadonly} tooltip={tooltip} />

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
      </div>
    </Section>
  );
};

export default memo(AddOnsSection);
