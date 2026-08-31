import { FC, memo, useMemo } from 'react';
import { Control, Controller, FieldErrors, useWatch } from 'react-hook-form';

import { MarketplaceI18nKeys } from '@/constants/i18n';
import { useDataContext } from '@/context/DataContext';
import { QuickApp2Form as QuickApp2FormType } from '@/form/quickApp2Form';
import { useTranslation } from '@/hooks/useTranslation';
import { Translation } from '@/types/translation';
import { doesModelAllowTemperature } from '@/utils/application';

import { FormCollapsibleSection } from '@/components/common/FormCollapsibleSection';
import { DialMarkdownEditorContainer } from '@/components/common/MarkdownEditor/MarkdownEditorContainer';
import { TemperatureSlider } from '@/components/common/Temperature';
import { ToggleSwitch } from '@/components/common/ToggleSwitch/ToggleSwitch';

import { ModelField } from './ModelField';

import { DialFormItem } from '@epam/ai-dial-ui-kit';

export interface OrchestratorSectionProps {
  control: Control<QuickApp2FormType>;
  errors: FieldErrors<QuickApp2FormType>;
  isReadonly: boolean;
  tooltip?: string;
  isProcessLargeFilesAvailable: boolean;
}

const OrchestratorSection: FC<OrchestratorSectionProps> = ({
  control,
  errors,
  isReadonly,
  tooltip,
  isProcessLargeFilesAvailable,
}) => {
  const { t } = useTranslation(Translation.Marketplace);
  const { modelsMap } = useDataContext();
  const modelId = useWatch({ control, name: 'model' });

  const showTemperatureSlider = useMemo(() => {
    const selectedModel = modelsMap[modelId];
    return selectedModel ? doesModelAllowTemperature(selectedModel) : true;
  }, [modelId, modelsMap]);

  return (
    <FormCollapsibleSection
      name={t(MarketplaceI18nKeys.Orchestrator)}
      description={t(MarketplaceI18nKeys.OrchestratorDescription)}
      openByDefault
    >
      <DialFormItem label={t(MarketplaceI18nKeys.ModelMarketplace)}>
        <Controller
          control={control}
          name="model"
          render={({ field }) => (
            <ModelField
              value={field.value}
              onChange={field.onChange}
              disabled={isReadonly}
              tooltip={tooltip}
              error={errors.model?.message}
            />
          )}
        />
      </DialFormItem>

      {showTemperatureSlider && (
        <DialFormItem label={t(MarketplaceI18nKeys.TemperatureMarketplace)}>
          <Controller
            control={control}
            name="temperature"
            render={({ field }) => (
              <TemperatureSlider
                temperature={field.value}
                onChangeTemperature={field.onChange}
                disabled={isReadonly}
                tooltip={tooltip}
              />
            )}
          />
        </DialFormItem>
      )}

      <DialFormItem label={t(MarketplaceI18nKeys.InstructionsMarketplace)}>
        <Controller
          control={control}
          name="instructions"
          render={({ field }) => (
            <DialMarkdownEditorContainer
              value={field.value}
              onChangeValue={field.onChange}
              placeholder={t(MarketplaceI18nKeys.InstructionsPlaceholder)}
            />
          )}
        />
      </DialFormItem>

      {isProcessLargeFilesAvailable && (
        <DialFormItem
          label={t(MarketplaceI18nKeys.ProcessFiles)}
          description={t(MarketplaceI18nKeys.ProcessFilesDescription)}
          className="!py-0"
        >
          <Controller
            control={control}
            name="processLargeFiles"
            render={({ field }) => (
              <ToggleSwitch
                isOn={field.value}
                handleSwitch={() => field.onChange(!field.value)}
                disabled={isReadonly}
                additionalText={t(MarketplaceI18nKeys.AllowOrchestratorToProcessFiles)}
                className="flex items-center gap-2"
                tooltip={tooltip}
              />
            )}
          />
        </DialFormItem>
      )}
    </FormCollapsibleSection>
  );
};

export default memo(OrchestratorSection);
