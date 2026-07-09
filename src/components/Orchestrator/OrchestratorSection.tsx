import { FC, memo } from 'react';
import { Control, Controller, FieldErrors } from 'react-hook-form';

import { MarketplaceI18nKeys } from '@/constants/i18n';
import { QuickApp2Form as QuickApp2FormType } from '@/form/quickApp2Form';
import { useTranslation } from '@/hooks/useTranslation';
import { Translation } from '@/types/translation';

import { FormCollapsibleSection } from '@/components/common/FormCollapsibleSection';
import { DialMarkdownEditorContainer } from '@/components/common/MarkdownEditor/MarkdownEditorContainer';
import { TemperatureSlider } from '@/components/common/Temperature';

import { ModelField } from './ModelField';

import { DialFormItem } from '@epam/ai-dial-ui-kit';

export interface OrchestratorSectionProps {
  control: Control<QuickApp2FormType>;
  errors: FieldErrors<QuickApp2FormType>;
  isReadonly: boolean;
  tooltip?: string;
}

const OrchestratorSection: FC<OrchestratorSectionProps> = ({
  control,
  errors,
  isReadonly,
  tooltip,
}) => {
  const { t } = useTranslation(Translation.Marketplace);

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
    </FormCollapsibleSection>
  );
};

export default memo(OrchestratorSection);
