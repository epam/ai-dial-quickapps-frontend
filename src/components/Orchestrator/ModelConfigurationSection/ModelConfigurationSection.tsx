import { FC, memo, useMemo } from 'react';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useDataContext } from '@/context/DataContext';
import type { QuickApp2FormErrors } from '@/types/quick-app-form';
import { useTranslation } from '@/hooks/useTranslation';
import { SectionRowVariant } from '@/types/section-row';
import { Translation } from '@/types/translation';
import { doesModelAllowTemperature } from '@/utils/application';

import { SectionRow } from '@/components/common/SectionRow/SectionRow';
import SettingsSection from '@/components/Settings/SettingsSection';

import { DefaultModelBlock } from '@/components/Orchestrator/DefaultModelBlock/DefaultModelBlock';

import { Slider, Switch } from '@epam/ai-dial-ui-kit';

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
        <DefaultModelBlock
          value={model}
          onChange={onModelChange}
          disabled={isReadonly}
          tooltip={tooltip}
          error={errors.model}
        />

        {showTemperatureSlider && (
          <SectionRow
            title={t(QuickAppEditorI18nKeys.Temperature)}
            description={t(QuickAppEditorI18nKeys.TemperatureDescription)}
            variant={SectionRowVariant.Caption}
          >
            <Slider
              aria-label={t(QuickAppEditorI18nKeys.Temperature)}
              value={temperature}
              min={0}
              max={1}
              step={0.1}
              disabled={isReadonly}
              showValue
              labels={[
                t(QuickAppEditorI18nKeys.TemperaturePrecise),
                t(QuickAppEditorI18nKeys.TemperatureNeutral),
                t(QuickAppEditorI18nKeys.TemperatureCreative),
              ]}
              onChange={onTemperatureChange}
            />
          </SectionRow>
        )}

        {isProcessLargeFilesAvailable && (
          <SectionRow
            title={t(QuickAppEditorI18nKeys.ProcessFiles)}
            description={t(QuickAppEditorI18nKeys.ProcessFilesDescription)}
            variant={SectionRowVariant.Caption}
          >
            <Switch
              isOn={processLargeFiles}
              onChange={onProcessLargeFilesChange}
              disabled={isReadonly}
              labelProps={{
                label: t(QuickAppEditorI18nKeys.AllowOrchestratorToProcessFiles),
                caption: tooltip,
              }}
              className="relative"
            />
          </SectionRow>
        )}

        <SettingsSection isReadonly={isReadonly} />
      </div>
    </section>
  );
};

export default memo(ModelConfigurationSection);
