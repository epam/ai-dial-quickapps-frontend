import { FC, memo, useState } from 'react';
import { Control, Controller } from 'react-hook-form';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { QuickApp2Form as QuickApp2FormType } from '@/form/quickApp2Form';
import { useTranslation } from '@/hooks/useTranslation';
import { Translation } from '@/types/translation';

import { AddOnRow } from '@/components/AddOns/AddOnRow';

import { AgentSkillsField } from './AgentSkillsField';

export interface AgentSkillsFormSectionProps {
  control: Control<QuickApp2FormType>;
  isReadonly: boolean;
  tooltip?: string;
}

const AgentSkillsFormSection: FC<AgentSkillsFormSectionProps> = ({
  control,
  isReadonly,
  tooltip,
}) => {
  const { t } = useTranslation(Translation.QuickAppEditor);
  const [isSkillsModalOpen, setIsSkillsModalOpen] = useState(false);

  return (
    <Controller
      control={control}
      name="agentSkills"
      render={({ field }) => (
        <AddOnRow
          label={t(QuickAppEditorI18nKeys.Skills)}
          emptyDescription={t(QuickAppEditorI18nKeys.AgentSkillsDescription)}
          isEmpty={!field.value?.length}
          isAddDisabled={isReadonly}
          addTooltip={tooltip ?? t(QuickAppEditorI18nKeys.AddAgentSkills)}
          onAdd={() => setIsSkillsModalOpen(true)}
        >
          <AgentSkillsField
            value={field.value}
            onChange={field.onChange}
            readonly={isReadonly}
            isSelectModalOpen={isSkillsModalOpen}
            onSelectModalOpenChange={setIsSkillsModalOpen}
          />
        </AddOnRow>
      )}
    />
  );
};

export default memo(AgentSkillsFormSection);
