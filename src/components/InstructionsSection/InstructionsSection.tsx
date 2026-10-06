import { FC, memo } from 'react';
import { Control, Controller } from 'react-hook-form';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { QuickApp2Form as QuickApp2FormType } from '@/form/quickApp2Form';
import { useTranslation } from '@/hooks/useTranslation';
import { Translation } from '@/types/translation';

import { DialMarkdownEditorContainer } from '@/components/common/MarkdownEditor/MarkdownEditorContainer';

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
      <h2 className="dial-medium-semi-text mb-4 text-primary">
        {t(QuickAppEditorI18nKeys.Instructions)}
      </h2>
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
    </section>
  );
};

export default memo(InstructionsSection);
