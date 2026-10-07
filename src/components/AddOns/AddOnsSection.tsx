import { FC, memo } from 'react';
import { Control, FieldErrors } from 'react-hook-form';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { QuickApp2Form as QuickApp2FormType } from '@/form/quickApp2Form';
import { useTranslation } from '@/hooks/useTranslation';
import { AnyToolset, DialAppTransportType } from '@/types/quick-apps';
import { Translation } from '@/types/translation';

import AgentSkillsFormSection from '@/components/AgentSkills/AgentSkillsFormSection';
import { AddOnRow } from '@/components/AddOns/AddOnRow';
import { AgentsAndToolsetsField } from '@/components/ContextAndTools/AgentsAndToolsetsField';
import { Section } from '@/components/common/Section/Section';

export interface AddOnsSectionProps {
  control: Control<QuickApp2FormType>;
  errors: FieldErrors<QuickApp2FormType>;
  isReadonly: boolean;
  tooltip?: string;
  agentsAndToolsets: QuickApp2FormType['agentsAndToolsets'];
  agentsAndToolsetsJson: string;
  isJsonView: boolean;
  onAgentsChange: (ids: string[]) => void;
  onJsonChange: (json: string) => void;
  onSwitchToJsonView: () => void;
  onSwitchToSimpleView: (toolsets: AnyToolset[]) => void;
  onDiscardJson: () => void;
  onConfigureAgent: (id: string, transport: DialAppTransportType) => void;
}

export const AddOnsSection: FC<AddOnsSectionProps> = ({
  control,
  errors,
  isReadonly,
  tooltip,
  agentsAndToolsets,
  agentsAndToolsetsJson,
  isJsonView,
  onAgentsChange,
  onJsonChange,
  onSwitchToJsonView,
  onSwitchToSimpleView,
  onDiscardJson,
  onConfigureAgent,
}) => {
  const { t } = useTranslation(Translation.QuickAppEditor);

  return (
    <Section title={t(QuickAppEditorI18nKeys.AddOns)}>
      <div className="flex flex-col gap-10">
        <AgentSkillsFormSection control={control} isReadonly={isReadonly} tooltip={tooltip} />

        <AddOnRow
          label={t(QuickAppEditorI18nKeys.AgentsAndToolsets)}
          description={t(QuickAppEditorI18nKeys.ContextAndToolsDescription)}
        >
          <AgentsAndToolsetsField
            agentsAndToolsets={agentsAndToolsets}
            agentsAndToolsetsJson={agentsAndToolsetsJson}
            isJsonView={isJsonView}
            onAgentsChange={onAgentsChange}
            onJsonChange={onJsonChange}
            onSwitchToJsonView={onSwitchToJsonView}
            onSwitchToSimpleView={onSwitchToSimpleView}
            onDiscardJson={onDiscardJson}
            onConfigureAgent={onConfigureAgent}
            readonly={isReadonly}
            tooltip={tooltip}
            addButtonClassName="!top-[-56px]"
            jsonError={errors.agentsAndToolsetsJson?.message}
          />
        </AddOnRow>
      </div>
    </Section>
  );
};

export default memo(AddOnsSection);
