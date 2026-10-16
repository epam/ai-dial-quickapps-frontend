import { FC, memo, useMemo } from 'react';

import { ApplicationEditorI18nKeys } from '@/constants/translation-keys';
import { useDataContext } from '@/context/DataContext';
import type { AdvancedSettingsValues } from '@/types/advanced-settings';
import type { QuickApp2FormErrors } from '@/types/quick-app-form';
import { useTranslation } from 'react-i18next';
import { doesModelAllowTemperature } from '@/utils/application';

import AttachmentsSection from '@/components/Attachments/AttachmentsSection/AttachmentsSection';
import SettingsSection from '@/components/Settings/SettingsSection/SettingsSection';

import { DefaultModelBlock } from '@/components/Orchestrator/DefaultModelBlock/DefaultModelBlock';

export interface ModelConfigurationSectionProps {
  model: string;
  onModelChange: (value: string) => void;
  errors: QuickApp2FormErrors;
  isReadonly: boolean;
  isProcessLargeFilesAvailable: boolean;
  isCodeInterpreterEnabled: boolean;
  isAddAttachmentEnabled: boolean;
  isWebFetchEnabled: boolean;
  advancedSettings: AdvancedSettingsValues;
  onAdvancedSettingsSave: (values: AdvancedSettingsValues) => void;
  isAttachmentsEnabled: boolean;
  onAttachmentsEnabledChange: (isEnabled: boolean) => void;
  inputAttachmentTypes: string[];
  onInputAttachmentTypesChange: (mimeTypes: string[]) => void;
}

const ModelConfigurationSection: FC<ModelConfigurationSectionProps> = ({
  model,
  onModelChange,
  errors,
  isReadonly,
  isProcessLargeFilesAvailable,
  isCodeInterpreterEnabled,
  isAddAttachmentEnabled,
  isWebFetchEnabled,
  advancedSettings,
  onAdvancedSettingsSave,
  isAttachmentsEnabled,
  onAttachmentsEnabledChange,
  inputAttachmentTypes,
  onInputAttachmentTypesChange,
}) => {
  const { t } = useTranslation();
  const { modelsMap } = useDataContext();

  const isTemperatureAvailable = useMemo(() => {
    const selectedModel = modelsMap[model];
    return selectedModel ? doesModelAllowTemperature(selectedModel) : true;
  }, [model, modelsMap]);

  return (
    <section aria-labelledby="model-configuration-heading" className="px-8">
      <h2 id="model-configuration-heading" className="dial-small-semi-text">
        {t(ApplicationEditorI18nKeys.Configuration)}
      </h2>
      <div className="mt-3 flex flex-col gap-3">
        <DefaultModelBlock
          value={model}
          onChange={onModelChange}
          isDisabled={isReadonly}
          error={errors.model ? t(errors.model as ApplicationEditorI18nKeys) : undefined}
        />

        <SettingsSection
          isReadonly={isReadonly}
          advancedSettings={advancedSettings}
          isTemperatureAvailable={isTemperatureAvailable}
          isProcessLargeFilesAvailable={isProcessLargeFilesAvailable}
          isCodeInterpreterEnabled={isCodeInterpreterEnabled}
          isAddAttachmentEnabled={isAddAttachmentEnabled}
          isWebFetchEnabled={isWebFetchEnabled}
          isAttachmentsEnabled={isAttachmentsEnabled}
          maxInputAttachmentsError={errors.maxInputAttachments}
          onAdvancedSettingsSave={onAdvancedSettingsSave}
        />

        <AttachmentsSection
          isEnabled={isAttachmentsEnabled}
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
