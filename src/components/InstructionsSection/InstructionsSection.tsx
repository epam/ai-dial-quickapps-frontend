import { FC, memo } from 'react';
import { Control, Controller } from 'react-hook-form';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { QuickApp2Form as QuickApp2FormType } from '@/form/quickApp2Form';
import { useTranslation } from '@/hooks/useTranslation';
import { Translation } from '@/types/translation';

import { Section } from '@/components/common/Section/Section';
import { DialMarkdownEditorContainer } from '@/components/common/MarkdownEditor/MarkdownEditorContainer';

export interface InstructionsSectionProps {
  control: Control<QuickApp2FormType>;
}

const InstructionsSection: FC<InstructionsSectionProps> = ({ control }) => {
  const { t } = useTranslation(Translation.QuickAppEditor);

  return (
    <Section title={t(QuickAppEditorI18nKeys.Instructions)} isRequired>
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
    </Section>
  );
};

export default memo(InstructionsSection);
