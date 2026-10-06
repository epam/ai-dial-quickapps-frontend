import { FC, memo } from 'react';
import { Control, Controller } from 'react-hook-form';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { QuickApp2Form as QuickApp2FormType } from '@/form/quickApp2Form';
import { useTranslation } from '@/hooks/useTranslation';
import { Translation } from '@/types/translation';

import { DialMarkdownEditorContainer } from '@/components/common/MarkdownEditor/MarkdownEditorContainer';

import { DialFormItem } from '@epam/ai-dial-ui-kit';

export interface InstructionsSectionProps {
  control: Control<QuickApp2FormType>;
}

const InstructionsSection: FC<InstructionsSectionProps> = ({ control }) => {
  const { t } = useTranslation(Translation.QuickAppEditor);

  return (
    <section
      aria-label={t(QuickAppEditorI18nKeys.Instructions)}
      className="rounded-[24px] bg-layer-0 p-8 shadow-sm"
    >
      <DialFormItem
        label={t(QuickAppEditorI18nKeys.Instructions)}
        labelClassName="dial-medium-semi-text !text-primary"
      >
        <Controller
          control={control}
          name="instructions"
          render={({ field }) => (
            <DialMarkdownEditorContainer
              value={field.value}
              onChangeValue={field.onChange}
              placeholder={t(QuickAppEditorI18nKeys.InstructionsPlaceholder)}
            />
          )}
        />
      </DialFormItem>
    </section>
  );
};

export default memo(InstructionsSection);
