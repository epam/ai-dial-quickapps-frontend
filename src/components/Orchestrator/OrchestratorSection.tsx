import { FC, memo } from 'react';
import { Control, Controller } from 'react-hook-form';

import { MarketplaceI18nKeys } from '@/constants/i18n';
import { QuickApp2Form as QuickApp2FormType } from '@/form/quickApp2Form';
import { useTranslation } from '@/hooks/useTranslation';
import { Translation } from '@/types/translation';

import { DialMarkdownEditorContainer } from '@/components/common/MarkdownEditor/MarkdownEditorContainer';

import { DialFormItem } from '@epam/ai-dial-ui-kit';

export interface OrchestratorSectionProps {
  control: Control<QuickApp2FormType>;
}

const OrchestratorSection: FC<OrchestratorSectionProps> = ({ control }) => {
  const { t } = useTranslation(Translation.Marketplace);

  return (
    <section
      aria-label={t(MarketplaceI18nKeys.InstructionsMarketplace)}
      className="px-5 py-4"
    >
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
    </section>
  );
};

export default memo(OrchestratorSection);
