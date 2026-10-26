import { FC, lazy, memo, Suspense, useCallback, useMemo, useState } from 'react';

import { MOBILE_FULLSCREEN_POPUP_CLASS_NAMES } from '@/constants/popup';
import { ApplicationEditorI18nKeys, ButtonsI18nKeys } from '@/constants/translation-keys';
import { useThemeContext } from '@/context/ThemeContext';
import type { QuickApp2Form } from '@/form/quickApp2Form';
import { ThemeId } from '@/types/theme';
import { parseEditJsonDocument, type EditJsonContext } from '@/utils/edit-json';
import { useTranslation } from 'react-i18next';

import {
  ButtonAppearance,
  ButtonVariant,
  DialLoader,
  EditorThemes,
  LazyDialJsonEditor,
  mergeClasses,
  Popup,
  PopupSize,
} from '@epam/ai-dial-ui-kit';

const DialJsonEditor = lazy(async () => ({
  default: (await LazyDialJsonEditor()).DialJsonEditor,
}));

export interface EditJsonPopupProps {
  /** The JSON shown when the popup opens; seeds the draft once per mount. */
  document: string;
  context: EditJsonContext;
  onSave: (values: QuickApp2Form) => void;
  onClose: () => void;
}

const EditJsonPopup: FC<EditJsonPopupProps> = ({ document, context, onSave, onClose }) => {
  const { t } = useTranslation();
  const { currentTheme } = useThemeContext();
  const [draft, setDraft] = useState(document);

  // With no loaded theme the page keeps the light stylesheet defaults, so the editor goes
  // dark only for a loaded non-light theme.
  const isDarkEditor = currentTheme != null && currentTheme.id !== ThemeId.Light;
  const editorTheme = isDarkEditor ? EditorThemes.dark : EditorThemes.light;

  const editorOptions = useMemo(
    () => ({
      ariaLabel: t(ApplicationEditorI18nKeys.EditJsonEditorLabel),
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      tabSize: 2,
    }),
    [t],
  );

  const result = useMemo(() => parseEditJsonDocument(draft, context), [context, draft]);

  const handleChange = useCallback((value?: string) => setDraft(value ?? ''), []);

  const handleSave = useCallback(() => {
    if (!result.isValid) return;
    onSave(result.values);
    onClose();
  }, [onClose, onSave, result]);

  return (
    <Popup
      open
      size={PopupSize.Lg}
      {...MOBILE_FULLSCREEN_POPUP_CLASS_NAMES}
      className={mergeClasses(MOBILE_FULLSCREEN_POPUP_CLASS_NAMES.className, 'md:max-w-[860px]')}
      header={t(ApplicationEditorI18nKeys.EditJsonTitle)}
      headerDivider
      footerDivider
      onClose={onClose}
      bodyClassName="max-w-full px-4 py-4 md:px-6"
      additionalButtons={[
        {
          label: t(ButtonsI18nKeys.Cancel),
          onClick: onClose,
          variant: ButtonVariant.Primary,
          appearance: ButtonAppearance.Link,
        },
      ]}
      mainButtons={[
        {
          label: t(ButtonsI18nKeys.Save),
          variant: ButtonVariant.Neutral,
          disabled: !result.isValid,
          onClick: handleSave,
        },
      ]}
    >
      <div className="flex flex-col gap-3 text-start">
        {/* Code reads left to right whatever the document direction is. */}
        <div dir="ltr" className="h-[min(32rem,55vh)] overflow-hidden rounded border border-primary">
          <Suspense fallback={<DialLoader fullWidth />}>
            <DialJsonEditor
              value={draft}
              currentTheme={editorTheme}
              onChange={handleChange}
              options={editorOptions}
            />
          </Suspense>
        </div>
        {!result.isValid && (
          <ul role="alert" className="flex flex-col gap-1 text-error dial-tiny">
            {result.errors.map(({ key, values }) => (
              <li key={`${key}:${values?.message ?? ''}`}>{t(key, values)}</li>
            ))}
          </ul>
        )}
      </div>
    </Popup>
  );
};

export default memo(EditJsonPopup);
