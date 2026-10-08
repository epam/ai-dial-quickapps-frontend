import { FC, lazy, memo, Suspense } from 'react';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useThemeContext } from '@/context/ThemeContext';
import { useTranslation } from '@/hooks/use-translation';
import { ThemeId } from '@/types/theme';
import { Translation } from '@/types/translation';

import { Section } from '@/components/common/Section/Section';

import { EditorThemes, ErrorText, LazyMarkdownEditor } from '@epam/ai-dial-ui-kit';

const EDITOR_HEIGHT = 200;

const MarkdownEditor = lazy(async () => ({
  default: (await LazyMarkdownEditor()).MarkdownEditor,
}));

export interface InstructionsSectionProps {
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

const InstructionsSection: FC<InstructionsSectionProps> = ({ value, error, onChange }) => {
  const { t } = useTranslation(Translation.QuickAppEditor);
  const { currentTheme } = useThemeContext();
  const editorTheme = currentTheme?.id === ThemeId.Light ? EditorThemes.light : EditorThemes.dark;

  return (
    <Section title={t(QuickAppEditorI18nKeys.Instructions)} isRequired>
      <Suspense fallback={null}>
        <MarkdownEditor
          value={value}
          onChange={onChange}
          height={EDITOR_HEIGHT}
          theme={editorTheme}
          placeholder={t(QuickAppEditorI18nKeys.InstructionsPlaceholder)}
          ariaLabel={t(QuickAppEditorI18nKeys.Instructions)}
          showDragbar={false}
        />
      </Suspense>
      <ErrorText text={error ? t(error) : undefined} />
    </Section>
  );
};

export default memo(InstructionsSection);
