import { FC, memo, useCallback, useId, useState } from 'react';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { isValidMaxInputAttachments } from '@/form/quickApp2Form';
import { useTranslation } from '@/hooks/useTranslation';
import type { AdvancedSettingsValues } from '@/types/advanced-settings';
import { Translation } from '@/types/translation';

import {
  ButtonAppearance,
  ButtonVariant,
  NumberInput,
  Popup,
  PopupSize,
  Switch,
} from '@epam/ai-dial-ui-kit';

export interface AdvancedSettingsPopupProps {
  isOpen: boolean;
  advancedSettings: AdvancedSettingsValues;
  maxInputAttachmentsError?: string;
  onSave: (values: AdvancedSettingsValues) => void;
  onClose: () => void;
}

const AdvancedSettingsPopup: FC<AdvancedSettingsPopupProps> = ({
  isOpen,
  advancedSettings,
  maxInputAttachmentsError,
  onSave,
  onClose,
}) => {
  const { t } = useTranslation(Translation.QuickAppEditor);
  const maxAttachmentsId = useId();
  // The draft is seeded once per mount; SettingsSection remounts the popup on every open.
  const [draft, setDraft] = useState<AdvancedSettingsValues>(advancedSettings);
  const [hasMaxAttachmentsError, setHasMaxAttachmentsError] = useState(!!maxInputAttachmentsError);

  const handleMaxAttachmentsChange = useCallback((value?: number | string) => {
    setHasMaxAttachmentsError(false);
    setDraft((current) => ({
      ...current,
      maxInputAttachments: value == null || value === '' ? '' : Number(value),
    }));
  }, []);

  const handleTimestampChange = useCallback(
    (timestamp: boolean) => setDraft((current) => ({ ...current, timestamp })),
    [],
  );

  const handleFileToolsChange = useCallback(
    (fileTools: boolean) => setDraft((current) => ({ ...current, fileTools })),
    [],
  );

  const handleSave = useCallback(() => {
    if (!isValidMaxInputAttachments(draft.maxInputAttachments)) {
      setHasMaxAttachmentsError(true);
      return;
    }
    onSave(draft);
    onClose();
  }, [draft, onClose, onSave]);

  return (
    <Popup
      open={isOpen}
      size={PopupSize.Sm}
      header={t(QuickAppEditorI18nKeys.AdvancedSettings)}
      closeAriaLabel={t(QuickAppEditorI18nKeys.CloseAdvancedSettings)}
      headerDivider
      footerDivider
      onClose={onClose}
      bodyClassName="min-h-[min(30rem,60vh)] max-w-full px-6 py-4"
      additionalButtons={[
        {
          label: t(QuickAppEditorI18nKeys.Close),
          onClick: onClose,
          variant: ButtonVariant.Primary,
          appearance: ButtonAppearance.Link,
        },
      ]}
      mainButtons={[
        {
          label: t(QuickAppEditorI18nKeys.Save),
          variant: ButtonVariant.Neutral,
          onClick: handleSave,
        },
      ]}
    >
      <div className="flex flex-col gap-6 text-start">
        <NumberInput
          id={maxAttachmentsId}
          labelProps={{
            label: t(QuickAppEditorI18nKeys.MaxAttachmentsUserCanAdd),
            htmlFor: maxAttachmentsId,
          }}
          value={draft.maxInputAttachments?.toString() ?? ''}
          onChange={handleMaxAttachmentsChange}
          integer
          min={1}
          caption={t(QuickAppEditorI18nKeys.MaxAttachmentsHint)}
          invalid={hasMaxAttachmentsError}
          error={
            hasMaxAttachmentsError ? t(QuickAppEditorI18nKeys.MaxAttachmentsInvalid) : undefined
          }
        />

        <Switch
          isOn={draft.timestamp}
          onChange={handleTimestampChange}
          labelProps={{ label: t(QuickAppEditorI18nKeys.TimeAwareness) }}
          caption={t(QuickAppEditorI18nKeys.TimeAwarenessDescription)}
        />

        <Switch
          isOn={draft.fileTools}
          onChange={handleFileToolsChange}
          labelProps={{ label: t(QuickAppEditorI18nKeys.BuiltInFileTools) }}
          caption={t(QuickAppEditorI18nKeys.BuiltInFileToolsDescription)}
        />
      </div>
    </Popup>
  );
};

export default memo(AdvancedSettingsPopup);
