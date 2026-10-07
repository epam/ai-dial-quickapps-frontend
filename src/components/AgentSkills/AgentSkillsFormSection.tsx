import { FC, memo } from 'react';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import type { QuickApp2FormValues } from '@/types/quick-app-form';
import { useTranslation } from '@/hooks/useTranslation';
import { Translation } from '@/types/translation';

import { FormCollapsibleSection } from '@/components/common/FormCollapsibleSection';

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

  return (
    <FormCollapsibleSection
      name={t(QuickAppEditorI18nKeys.AgentSkills)}
      description={t(QuickAppEditorI18nKeys.AgentSkillsDescription)}
    >
      <AgentSkillsField
        value={value}
        onChange={onChange}
        readonly={isReadonly}
        tooltip={tooltip}
      />
    </FormCollapsibleSection>
  );
};

export default memo(AgentSkillsFormSection);
