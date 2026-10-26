import { FC, memo, useMemo } from 'react';

import { ApplicationEditorI18nKeys } from '@/constants/translation-keys';
import { useDataContext } from '@/context/DataContext';
import type { AdvancedSettingsValues } from '@/types/advanced-settings';
import type { QuickApp2FormErrors } from '@/types/quick-app-form';
import { useTranslation } from 'react-i18next';
import { doesModelAllowTemperature } from '@/utils/application';

import AttachmentsSection from '@/components/Attachments/AttachmentsSection/AttachmentsSection';
import CodeInterpreterSection from '@/components/Settings/CodeInterpreterSection/CodeInterpreterSection';
import EditJsonLink from '@/components/EditJson/EditJsonLink/EditJsonLink';
import SettingsSection from '@/components/Settings/SettingsSection/SettingsSection';

import { DefaultModelBlock } from '@/components/Orchestrator/DefaultModelBlock/DefaultModelBlock';

export interface ModelConfigurationSectionProps {
  model: string;
  onModelChange: (value: string) => void;
  errors: QuickApp2FormErrors;
  isProcessLargeFilesAvailable: boolean;
  isCodeInterpreterEnabled: boolean;
  isCodeInterpreterOn: boolean;
  onCodeInterpreterChange: (isEnabled: boolean) => void;
  isAddAttachmentEnabled: boolean;
  isWebFetchEnabled: boolean;
  advancedSettings: AdvancedSettingsValues;
  onAdvancedSettingsSave: (values: AdvancedSettingsValues) => void;
  isAttachmentsEnabled: boolean;
  onAttachmentsEnabledChange: (isEnabled: boolean) => void;
  inputAttachmentTypes: string[];
  onInputAttachmentTypesChange: (mimeTypes: string[]) => void;
  onEditJsonClick: () => void;
}

const ModelConfigurationSection: FC<ModelConfigurationSectionProps> = ({
  model,
  onModelChange,
  errors,
  isProcessLargeFilesAvailable,
  isCodeInterpreterEnabled,
  isCodeInterpreterOn,
  onCodeInterpreterChange,
  isAddAttachmentEnabled,
  isWebFetchEnabled,
  advancedSettings,
  onAdvancedSettingsSave,
  isAttachmentsEnabled,
  onAttachmentsEnabledChange,
  inputAttachmentTypes,
  onInputAttachmentTypesChange,
  onEditJsonClick,
}) => {
  const { t } = useTranslation();
  const { modelsMap } = useDataContext();

  const isTemperatureAvailable = useMemo(() => {
    const selectedModel = modelsMap[model];
    return selectedModel ? doesModelAllowTemperature(selectedModel) : true;
  }, [model, modelsMap]);

  return (
    <section
      aria-labelledby="model-configuration-heading"
      className="flex min-h-0 flex-col px-8 pb-4"
    >
      <h2 id="model-configuration-heading" className="dial-small-semi-text">
        {t(ApplicationEditorI18nKeys.Configuration)}
      </h2>
      <div className="mt-3 mb-6 flex flex-col gap-3">
        <DefaultModelBlock
          value={model}
          onChange={onModelChange}
          error={errors.model ? t(errors.model as ApplicationEditorI18nKeys) : undefined}
        />

        <SettingsSection
          advancedSettings={advancedSettings}
          isTemperatureAvailable={isTemperatureAvailable}
          isProcessLargeFilesAvailable={isProcessLargeFilesAvailable}
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
          onEnabledChange={onAttachmentsEnabledChange}
          onChange={onInputAttachmentTypesChange}
        />

        {isCodeInterpreterEnabled && (
          <CodeInterpreterSection
            isEnabled={isCodeInterpreterOn}
            onEnabledChange={onCodeInterpreterChange}
          />
        )}
      </div>

      <div className="mt-auto flex justify-end border-t border-primary pt-3">
        <EditJsonLink onClick={onEditJsonClick} />
      </div>
    </section>
  );
};

export default memo(ModelConfigurationSection);
