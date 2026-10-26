import { FC, memo, useCallback, useId, useState } from 'react';

import { MOBILE_FULLSCREEN_POPUP_CLASS_NAMES } from '@/constants/popup';
import {
  ApplicationEditorI18nKeys,
  ButtonsI18nKeys,
  ChatSettingsI18nKeys,
} from '@/constants/translation-keys';
import { isValidMaxInputAttachments } from '@/form/quickApp2Form';
import { useTranslation } from 'react-i18next';
import type { AdvancedSettingsValues } from '@/types/advanced-settings';
import { getTemperatureScaleLabelKey } from '@/utils/application';
import { snapToStep } from '@/utils/snap-to-step';
import { MAX_TEMPERATURE, MIN_TEMPERATURE, TEMPERATURE_STEP } from '@/constants/quick-apps';

import {
  ButtonAppearance,
  ButtonVariant,
  mergeClasses,
  NumberInput,
  Popup,
  PopupSize,
  Slider,
  Switch,
} from '@epam/ai-dial-ui-kit';

export interface AdvancedSettingsPopupProps {
  isOpen: boolean;
  advancedSettings: AdvancedSettingsValues;
  isTemperatureAvailable: boolean;
  isProcessLargeFilesAvailable: boolean;
  isAddAttachmentEnabled: boolean;
  isWebFetchEnabled: boolean;
  isAttachmentsEnabled: boolean;
  maxInputAttachmentsError?: string;
  onSave: (values: AdvancedSettingsValues) => void;
  onClose: () => void;
}

const AdvancedSettingsPopup: FC<AdvancedSettingsPopupProps> = ({
  isOpen,
  advancedSettings,
  isTemperatureAvailable,
  isProcessLargeFilesAvailable,
  isAddAttachmentEnabled,
  isWebFetchEnabled,
  isAttachmentsEnabled,
  maxInputAttachmentsError,
  onSave,
  onClose,
}) => {
  const { t } = useTranslation();
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

  const handleTemperatureChange = useCallback(
    (temperature: number) => setDraft((current) => ({ ...current, temperature })),
    [],
  );

  // Duplicates the ui-kit Slider's `showValueInput` until that release is installed: the text
  // being typed is kept while editing, so a half-typed "0." is not snapped back to "0".
  const [temperatureText, setTemperatureText] = useState<string | null>(null);

  const handleTemperatureInputChange = useCallback((value?: number | string) => {
    const text = value == null ? '' : String(value);
    setTemperatureText(text);
    const parsed = Number(text);
    if (text !== '' && Number.isFinite(parsed)) {
      setDraft((current) => ({
        ...current,
        temperature: snapToStep(parsed, MIN_TEMPERATURE, MAX_TEMPERATURE, TEMPERATURE_STEP),
      }));
    }
  }, []);

  const handleTemperatureInputBlur = useCallback(() => setTemperatureText(null), []);

  const formatTemperature = useCallback(
    (value: number) => t(getTemperatureScaleLabelKey(value)),
    [t],
  );

  const handleTimestampChange = useCallback(
    (timestamp: boolean) => setDraft((current) => ({ ...current, timestamp })),
    [],
  );

  const handleFileToolsChange = useCallback(
    (fileTools: boolean) => setDraft((current) => ({ ...current, fileTools })),
    [],
  );

  const handleProcessLargeFilesChange = useCallback(
    (processLargeFiles: boolean) => setDraft((current) => ({ ...current, processLargeFiles })),
    [],
  );

  const handleAddAttachmentChange = useCallback(
    (addAttachment: boolean) => setDraft((current) => ({ ...current, addAttachment })),
    [],
  );

  const handleWebFetchChange = useCallback(
    (webFetch: boolean) => setDraft((current) => ({ ...current, webFetch })),
    [],
  );

  const handleSave = useCallback(() => {
    if (!isValidMaxInputAttachments(draft.maxInputAttachments, isAttachmentsEnabled)) {
      setHasMaxAttachmentsError(true);
      return;
    }
    onSave(draft);
    onClose();
  }, [draft, isAttachmentsEnabled, onClose, onSave]);

  const maxAttachmentsErrorKey =
    draft.maxInputAttachments == null || draft.maxInputAttachments === ''
      ? ApplicationEditorI18nKeys.AdvancedSettingsMaxAttachmentsRequired
      : ApplicationEditorI18nKeys.AdvancedSettingsMaxAttachmentsInvalid;

  return (
    <Popup
      open={isOpen}
      size={PopupSize.Sm}
      {...MOBILE_FULLSCREEN_POPUP_CLASS_NAMES}
      // The design is ~586px wide: between the kit's Sm (400px) and Md (800px) presets.
      className={mergeClasses(MOBILE_FULLSCREEN_POPUP_CLASS_NAMES.className, 'md:max-w-[586px]')}
      header={t(ApplicationEditorI18nKeys.AdvancedSettingsTitle)}
      closeAriaLabel={t(ApplicationEditorI18nKeys.AdvancedSettingsClose)}
      headerDivider
      footerDivider
      onClose={onClose}
      bodyClassName="min-h-[min(30rem,60vh)] max-w-full px-4 py-4 md:px-6"
      additionalButtons={[
        {
          label: t(ButtonsI18nKeys.Close),
          onClick: onClose,
          variant: ButtonVariant.Primary,
          appearance: ButtonAppearance.Link,
        },
      ]}
      mainButtons={[
        {
          label: t(ButtonsI18nKeys.Save),
          variant: ButtonVariant.Neutral,
          onClick: handleSave,
        },
      ]}
    >
      <div className="flex flex-col gap-6 text-start">
        {isTemperatureAvailable && (
          <Slider
            labelProps={{ label: t(ChatSettingsI18nKeys.TemperatureLabel) }}
            value={draft.temperature}
            min={MIN_TEMPERATURE}
            max={MAX_TEMPERATURE}
            step={TEMPERATURE_STEP}
            showTicks
            showTooltip
            formatValue={formatTemperature}
            rightContent={
              <NumberInput
                aria-label={t(ApplicationEditorI18nKeys.AdvancedSettingsTemperatureValue)}
                value={temperatureText ?? draft.temperature.toFixed(1)}
                min={MIN_TEMPERATURE}
                max={MAX_TEMPERATURE}
                step={TEMPERATURE_STEP}
                containerClassName="w-12"
                className="text-center"
                onChange={handleTemperatureInputChange}
                onBlur={handleTemperatureInputBlur}
              />
            }
            onChange={handleTemperatureChange}
          />
        )}

        <NumberInput
          id={maxAttachmentsId}
          labelProps={{
            label: t(ApplicationEditorI18nKeys.AdvancedSettingsMaxAttachments),
            htmlFor: maxAttachmentsId,
          }}
          value={draft.maxInputAttachments?.toString() ?? ''}
          onChange={handleMaxAttachmentsChange}
          integer
          min={1}
          caption={t(ApplicationEditorI18nKeys.AdvancedSettingsMaxAttachmentsHint)}
          placeholder={t(ApplicationEditorI18nKeys.AdvancedSettingsMaxAttachmentsPlaceholder)}
          invalid={hasMaxAttachmentsError}
          error={hasMaxAttachmentsError ? t(maxAttachmentsErrorKey) : undefined}
        />

        <Switch
          isOn={draft.timestamp}
          onChange={handleTimestampChange}
          labelProps={{ label: t(ApplicationEditorI18nKeys.AdvancedSettingsTimeAwareness) }}
          caption={t(ApplicationEditorI18nKeys.AdvancedSettingsTimeAwarenessDescription)}
        />

        <Switch
          isOn={draft.fileTools}
          onChange={handleFileToolsChange}
          labelProps={{ label: t(ApplicationEditorI18nKeys.AdvancedSettingsBuiltInFileTools) }}
          caption={t(ApplicationEditorI18nKeys.AdvancedSettingsBuiltInFileToolsDescription)}
        />

        {isProcessLargeFilesAvailable && (
          <Switch
            isOn={draft.processLargeFiles}
            onChange={handleProcessLargeFilesChange}
            labelProps={{ label: t(ApplicationEditorI18nKeys.AdvancedSettingsProcessFiles) }}
            caption={t(ApplicationEditorI18nKeys.AdvancedSettingsProcessFilesDescription)}
          />
        )}

        {isAddAttachmentEnabled && (
          <Switch
            isOn={draft.addAttachment}
            onChange={handleAddAttachmentChange}
            labelProps={{ label: t(ApplicationEditorI18nKeys.AdvancedSettingsAddAttachment) }}
            caption={t(ApplicationEditorI18nKeys.AdvancedSettingsAddAttachmentDescription)}
          />
        )}

        {isWebFetchEnabled && (
          <Switch
            isOn={draft.webFetch}
            onChange={handleWebFetchChange}
            labelProps={{ label: t(ApplicationEditorI18nKeys.AdvancedSettingsWebFetch) }}
            caption={t(ApplicationEditorI18nKeys.AdvancedSettingsWebFetchDescription)}
          />
        )}
      </div>
    </Popup>
  );
};

export default memo(AdvancedSettingsPopup);
