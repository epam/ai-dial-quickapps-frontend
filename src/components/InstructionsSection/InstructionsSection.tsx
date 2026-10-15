import { FC, lazy, memo, Suspense } from 'react';

import { ApplicationEditorI18nKeys } from '@/constants/translation-keys';
import { useThemeContext } from '@/context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { ThemeId } from '@/types/theme';

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
  const { t } = useTranslation();
  const { currentTheme } = useThemeContext();
  // With no loaded theme the page keeps the light stylesheet defaults, so the
  // editor goes dark only for a loaded non-light theme.
  const isDarkEditor = currentTheme != null && currentTheme.id !== ThemeId.Light;
  const editorTheme = isDarkEditor ? EditorThemes.dark : EditorThemes.light;

  return (
    <Section title={t(ApplicationEditorI18nKeys.InstructionsLabel)} isRequired>
      <Suspense fallback={null}>
        <MarkdownEditor
          value={value}
          onChange={onChange}
          height={EDITOR_HEIGHT}
          theme={editorTheme}
          placeholder={t(ApplicationEditorI18nKeys.InstructionsPlaceholder)}
          ariaLabel={t(ApplicationEditorI18nKeys.InstructionsLabel)}
          showDragbar={false}
        />
      </Suspense>
      <ErrorText text={error ? t(error as ApplicationEditorI18nKeys) : undefined} />
    </Section>
  );
};

export default memo(InstructionsSection);
