import { FC, memo, useState } from 'react';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import type { QuickApp2FormValues } from '@/types/quick-app-form';
import { useTranslation } from '@/hooks/useTranslation';
import { Translation } from '@/types/translation';

import { AddOnRow } from '@/components/AddOns/AddOnRow';

import { AgentSkillsField } from './AgentSkillsField';

export interface AgentSkillsFormSectionProps {
  value: QuickApp2FormValues['agentSkills'];
  onChange: (value: QuickApp2FormValues['agentSkills']) => void;
  isReadonly: boolean;
  tooltip?: string;
}

const AgentSkillsFormSection: FC<AgentSkillsFormSectionProps> = ({
  value,
  onChange,
  isReadonly,
  tooltip,
}) => {
  const { t } = useTranslation(Translation.QuickAppEditor);
  const [isSkillsModalOpen, setIsSkillsModalOpen] = useState(false);

  return (
    <AddOnRow
      label={t(QuickAppEditorI18nKeys.Skills)}
      emptyDescription={t(QuickAppEditorI18nKeys.AgentSkillsDescription)}
      isEmpty={!value?.length}
      isAddDisabled={isReadonly}
      addTooltip={tooltip ?? t(QuickAppEditorI18nKeys.AddAgentSkills)}
      onAdd={() => setIsSkillsModalOpen(true)}
    >
      <AgentSkillsField
        value={value}
        onChange={onChange}
        readonly={isReadonly}
        isSelectModalOpen={isSkillsModalOpen}
        onSelectModalOpenChange={setIsSkillsModalOpen}
      />
    </AddOnRow>
  );
};

export default memo(AgentSkillsFormSection);
