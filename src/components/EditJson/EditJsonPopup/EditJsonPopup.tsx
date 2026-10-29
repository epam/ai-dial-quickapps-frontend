import { IconCheck, IconCopy, IconDownload } from '@tabler/icons-react';
import { FC, lazy, memo, Suspense, useCallback, useEffect, useMemo, useState } from 'react';

import { MOBILE_FULLSCREEN_POPUP_CLASS_NAMES } from '@/constants/popup';
import {
  EDIT_JSON_EDITOR_OPTIONS,
  EDIT_JSON_LIGHT_THEMES_CONFIG,
} from '@/constants/edit-json-editor';
import { EDIT_JSON_COPIED_RESET_MS, EDIT_JSON_DOWNLOAD_FILE_NAME } from '@/constants/editor';
import {
  ApplicationEditorI18nKeys,
  ButtonsI18nKeys,
  ChatI18nKeys,
} from '@/constants/translation-keys';
import { useThemeContext } from '@/context/ThemeContext';
import type { QuickApp2Form } from '@/types/quick-app-form';
import { ThemeId } from '@/types/theme';
import { parseEditJsonDocument, type EditJsonContext } from '@/utils/edit-json';
import { downloadTextFile } from '@/utils/file-download';
import { useTranslation } from 'react-i18next';

import {
  ButtonAppearance,
  ButtonVariant,
  DIAL_ICON_SIZE,
  DIAL_KIT_ICON_STROKE,
  DialLoader,
  EditorThemes,
  ElementSize,
  ErrorText,
  GhostIconButton,
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
  const [isCopied, setIsCopied] = useState(false);

  // With no loaded theme the page keeps the light stylesheet defaults, so the editor goes
  // dark only for a loaded non-light theme.
  const isDarkEditor = currentTheme != null && currentTheme.id !== ThemeId.Light;
  const editorTheme = isDarkEditor ? EditorThemes.dark : EditorThemes.light;

  const editorOptions = useMemo(
    () => ({
      ...EDIT_JSON_EDITOR_OPTIONS,
      ariaLabel: t(ApplicationEditorI18nKeys.EditJsonEditorLabel),
    }),
    [t],
  );

  const result = useMemo(() => parseEditJsonDocument(draft, context), [context, draft]);

  const handleChange = useCallback((value?: string) => setDraft(value ?? ''), []);

  useEffect(() => {
    if (!isCopied) return;
    const timer = setTimeout(() => setIsCopied(false), EDIT_JSON_COPIED_RESET_MS);
    return () => clearTimeout(timer);
  }, [isCopied]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setIsCopied(true);
    } catch {
      // The clipboard can be unavailable (insecure context, denied permission): nothing to copy to.
    }
  }, [draft]);

  const handleDownload = useCallback(
    () => downloadTextFile(draft, EDIT_JSON_DOWNLOAD_FILE_NAME),
    [draft],
  );

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
      className={mergeClasses(MOBILE_FULLSCREEN_POPUP_CLASS_NAMES.className, 'md:max-w-[1270px]')}
      header={t(ApplicationEditorI18nKeys.EditJsonTitle)}
      footerDivider
      onClose={onClose}
      bodyClassName="max-w-full px-4 py-4 md:px-6"
      additionalButtons={[
        {
          label: t(ButtonsI18nKeys.Cancel),
          // The design leaves about 25px between Cancel and Save: the footer's 8px gap plus this.
          className: 'me-4',
          onClick: onClose,
          variant: ButtonVariant.Primary,
          appearance: ButtonAppearance.Link,
        },
      ]}
      mainButtons={[
        {
          label: t(ButtonsI18nKeys.Save),
          // The design's Save is a wider pill (about 94px) than the kit's default padding gives.
          className: 'px-8',
          variant: ButtonVariant.Neutral,
          disabled: !result.isValid,
          onClick: handleSave,
        },
      ]}
    >
      <div className="flex flex-col gap-3 text-start">
        <div className="overflow-hidden rounded-lg border border-tertiary">
          <div className="flex items-center justify-between ps-3 pe-2 pt-2">
            <span className="dial-small-semi-text text-secondary">
              {t(ApplicationEditorI18nKeys.EditJsonFormatLabel)}
            </span>
            <div className="flex items-center gap-1">
              <GhostIconButton
                size={ElementSize.Small}
                icon={
                  isCopied ? (
                    <IconCheck size={DIAL_ICON_SIZE.SM} stroke={DIAL_KIT_ICON_STROKE} />
                  ) : (
                    <IconCopy size={DIAL_ICON_SIZE.SM} stroke={DIAL_KIT_ICON_STROKE} />
                  )
                }
                aria-label={t(isCopied ? ButtonsI18nKeys.Copied : ChatI18nKeys.CopyCode)}
                onClick={handleCopy}
              />
              <GhostIconButton
                size={ElementSize.Small}
                icon={<IconDownload size={DIAL_ICON_SIZE.SM} stroke={DIAL_KIT_ICON_STROKE} />}
                aria-label={t(ChatI18nKeys.DownloadCode)}
                onClick={handleDownload}
              />
            </div>
          </div>
          {/* Code reads left to right whatever the document direction is. */}
          <div dir="ltr" className="h-[min(36rem,60vh)]">
            <Suspense fallback={<DialLoader fullWidth />}>
              <DialJsonEditor
                value={draft}
                currentTheme={editorTheme}
                themesConfig={isDarkEditor ? undefined : EDIT_JSON_LIGHT_THEMES_CONFIG}
                onChange={handleChange}
                options={editorOptions}
              />
            </Suspense>
          </div>
        </div>
        {!result.isValid && (
          <div role="alert" className="flex flex-col gap-1">
            {result.errors.map(({ key, values }) => (
              <ErrorText
                key={`${key}:${values?.message ?? ''}`}
                text={t(key, values)}
                className="block"
              />
            ))}
          </div>
        )}
      </div>
    </Popup>
  );
};

export default memo(EditJsonPopup);
