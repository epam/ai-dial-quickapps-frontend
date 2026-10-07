import { FC, memo, useMemo } from 'react';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useDataContext } from '@/context/DataContext';
import type { QuickApp2FormErrors } from '@/types/quick-app-form';
import { useTranslation } from '@/hooks/useTranslation';
import { Translation } from '@/types/translation';
import { doesModelAllowTemperature } from '@/utils/application';

import { TemperatureSlider } from '@/components/common/Temperature';
import { ToggleSwitch } from '@/components/common/ToggleSwitch/ToggleSwitch';
import SettingsSection from '@/components/Settings/SettingsSection';

import { ModelField } from '../ModelField';

import { DialFormItem } from '@epam/ai-dial-ui-kit';

export interface ModelConfigurationSectionProps {
  model: string;
  onModelChange: (value: string) => void;
  temperature: number;
  onTemperatureChange: (value: number) => void;
  processLargeFiles: boolean;
  onProcessLargeFilesChange: (value: boolean) => void;
  errors: QuickApp2FormErrors;
  isReadonly: boolean;
  tooltip?: string;
  isProcessLargeFilesAvailable: boolean;
}

const ModelConfigurationSection: FC<ModelConfigurationSectionProps> = ({
  model,
  onModelChange,
  temperature,
  onTemperatureChange,
  processLargeFiles,
  onProcessLargeFilesChange,
  errors,
  isReadonly,
  tooltip,
  isProcessLargeFilesAvailable,
}) => {
  const { t } = useTranslation(Translation.QuickAppEditor);
  const { modelsMap } = useDataContext();

  const showTemperatureSlider = useMemo(() => {
    const selectedModel = modelsMap[model];
    return selectedModel ? doesModelAllowTemperature(selectedModel) : true;
  }, [model, modelsMap]);

  return (
    <section aria-labelledby="model-configuration-heading" className="px-8">
      <h2 id="model-configuration-heading" className="dial-small-semi-text">
        {t(QuickAppEditorI18nKeys.Configuration)}
      </h2>
      <div className="mt-3 flex flex-col gap-3">
        <ModelField
          value={model}
          onChange={onModelChange}
          disabled={isReadonly}
          tooltip={tooltip}
          error={errors.model}
        />

        {showTemperatureSlider && (
          <DialFormItem label={t(QuickAppEditorI18nKeys.Temperature)}>
            <TemperatureSlider
              temperature={temperature}
              onChangeTemperature={onTemperatureChange}
              disabled={isReadonly}
              tooltip={tooltip}
            />
          </DialFormItem>
        )}

        {isProcessLargeFilesAvailable && (
          <DialFormItem
            label={t(QuickAppEditorI18nKeys.ProcessFiles)}
            description={t(QuickAppEditorI18nKeys.ProcessFilesDescription)}
            className="!py-0"
          >
            <ToggleSwitch
              isOn={processLargeFiles}
              handleSwitch={() => onProcessLargeFilesChange(!processLargeFiles)}
              disabled={isReadonly}
              additionalText={t(QuickAppEditorI18nKeys.AllowOrchestratorToProcessFiles)}
              className="flex items-center gap-2"
              tooltip={tooltip}
            />
          </DialFormItem>
        )}

        <SettingsSection isReadonly={isReadonly} />
      </div>
    </section>
  );
};

export default memo(ModelConfigurationSection);
