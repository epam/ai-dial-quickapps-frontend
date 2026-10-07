import { FC, memo } from 'react';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useTranslation } from '@/hooks/useTranslation';
import { Translation } from '@/types/translation';

import { DialMarkdownEditorContainer } from '@/components/common/MarkdownEditor/MarkdownEditorContainer';

import { DialFormItem } from '@epam/ai-dial-ui-kit';

export interface InstructionsSectionProps {
  value: string;
  onChange: (value: string) => void;
}

const InstructionsSection: FC<InstructionsSectionProps> = ({ value, onChange }) => {
  const { t } = useTranslation(Translation.QuickAppEditor);

  return (
    <section
      aria-label={t(QuickAppEditorI18nKeys.Instructions)}
      className="rounded-[24px] bg-layer-0 p-8 shadow-sm"
    >
      <DialFormItem label={t(QuickAppEditorI18nKeys.Instructions)}>
        <DialMarkdownEditorContainer
          value={value}
          onChangeValue={onChange}
          placeholder={t(QuickAppEditorI18nKeys.InstructionsPlaceholder)}
        />
      </DialFormItem>
    </section>
  );
};

export default memo(InstructionsSection);
