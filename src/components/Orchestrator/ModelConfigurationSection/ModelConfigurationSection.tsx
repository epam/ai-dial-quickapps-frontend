import { FC, memo, useMemo } from 'react';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useDataContext } from '@/context/DataContext';
import type { AdvancedSettingsValues } from '@/types/advanced-settings';
import type { QuickApp2FormErrors } from '@/types/quick-app-form';
import { useTranslation } from '@/hooks/useTranslation';
import { Translation } from '@/types/translation';
import { doesModelAllowTemperature } from '@/utils/application';

import AttachmentsSection from '@/components/Attachments/AttachmentsSection';
import SettingsSection from '@/components/Settings/SettingsSection';

import { DefaultModelBlock } from '@/components/Orchestrator/DefaultModelBlock/DefaultModelBlock';

export interface ModelConfigurationSectionProps {
  model: string;
  onModelChange: (value: string) => void;
  errors: QuickApp2FormErrors;
  isReadonly: boolean;
  tooltip?: string;
  isProcessLargeFilesAvailable: boolean;
  advancedSettings: AdvancedSettingsValues;
  onAdvancedSettingsSave: (values: AdvancedSettingsValues) => void;
  attachmentsEnabled: boolean;
  onAttachmentsEnabledChange: (isEnabled: boolean) => void;
  inputAttachmentTypes: string[];
  onInputAttachmentTypesChange: (mimeTypes: string[]) => void;
}

const ModelConfigurationSection: FC<ModelConfigurationSectionProps> = ({
  model,
  onModelChange,
  errors,
  isReadonly,
  tooltip,
  isProcessLargeFilesAvailable,
  advancedSettings,
  onAdvancedSettingsSave,
  attachmentsEnabled,
  onAttachmentsEnabledChange,
  inputAttachmentTypes,
  onInputAttachmentTypesChange,
}) => {
  const { t } = useTranslation(Translation.QuickAppEditor);
  const { modelsMap } = useDataContext();

  const isTemperatureAvailable = useMemo(() => {
    const selectedModel = modelsMap[model];
    return selectedModel ? doesModelAllowTemperature(selectedModel) : true;
  }, [model, modelsMap]);

  return (
    <section aria-labelledby="model-configuration-heading" className="px-8">
      <h2 id="model-configuration-heading" className="dial-small-semi-text">
        {t(QuickAppEditorI18nKeys.Configuration)}
      </h2>
      <div className="mt-3 flex flex-col gap-3">
        <DefaultModelBlock
          value={model}
          onChange={onModelChange}
          disabled={isReadonly}
          tooltip={tooltip}
          error={errors.model}
        />

        <SettingsSection
          isReadonly={isReadonly}
          advancedSettings={advancedSettings}
          isTemperatureAvailable={isTemperatureAvailable}
          isProcessLargeFilesAvailable={isProcessLargeFilesAvailable}
          maxInputAttachmentsError={errors.maxInputAttachments}
          onAdvancedSettingsSave={onAdvancedSettingsSave}
        />

        <AttachmentsSection
          isEnabled={attachmentsEnabled}
          value={inputAttachmentTypes}
          error={errors.inputAttachmentTypes}
          isReadonly={isReadonly}
          onEnabledChange={onAttachmentsEnabledChange}
          onChange={onInputAttachmentTypesChange}
        />
      </div>
    </section>
  );
};

export default memo(ModelConfigurationSection);
