import { FC, memo } from 'react';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useTranslation } from '@/hooks/useTranslation';
import { Translation } from '@/types/translation';

import { Section } from '@/components/common/Section/Section';
import { DialMarkdownEditorContainer } from '@/components/common/MarkdownEditor/MarkdownEditorContainer';

export interface InstructionsSectionProps {
  value: string;
  onChange: (value: string) => void;
}

const InstructionsSection: FC<InstructionsSectionProps> = ({ value, onChange }) => {
  const { t } = useTranslation(Translation.QuickAppEditor);

  return (
    <Section title={t(QuickAppEditorI18nKeys.Instructions)} isRequired>
      <DialMarkdownEditorContainer
        value={value}
        onChangeValue={onChange}
        placeholder={t(QuickAppEditorI18nKeys.InstructionsPlaceholder)}
      />
    </Section>
  );
};

export default memo(InstructionsSection);
