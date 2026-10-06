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
    <section
      aria-label={t(QuickAppEditorI18nKeys.AddOns)}
      className="mt-4 rounded-[24px] bg-layer-raised p-8 shadow-sm"
    >
      <h2 className="dial-medium-semi-text">{t(QuickAppEditorI18nKeys.AddOns)}</h2>
      <div className="mt-4 flex flex-col gap-10">
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
    </section>
  );
};

export default memo(AddOnsSection);
