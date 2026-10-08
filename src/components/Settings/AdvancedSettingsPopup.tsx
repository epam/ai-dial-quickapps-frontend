import { FC, memo, useCallback, useId, useState } from 'react';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { isValidMaxInputAttachments } from '@/form/quickApp2Form';
import { useTranslation } from '@/hooks/useTranslation';
import type { AdvancedSettingsValues } from '@/types/advanced-settings';
import { Translation } from '@/types/translation';
import { getTemperatureScaleLabelKey } from '@/utils/application';
import { snapToStep } from '@/utils/snap-to-step';
import { MAX_TEMPERATURE, MIN_TEMPERATURE, TEMPERATURE_STEP } from '@/constants/quick-apps';

import {
  ButtonAppearance,
  ButtonVariant,
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
  maxInputAttachmentsError?: string;
  onSave: (values: AdvancedSettingsValues) => void;
  onClose: () => void;
}

const AdvancedSettingsPopup: FC<AdvancedSettingsPopupProps> = ({
  isOpen,
  advancedSettings,
  isTemperatureAvailable,
  isProcessLargeFilesAvailable,
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
      // The design is ~586px wide: between the kit's Sm (400px) and Md (800px) presets.
      className="md:max-w-[586px]"
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
        {isTemperatureAvailable && (
          <Slider
            labelProps={{ label: t(QuickAppEditorI18nKeys.Temperature) }}
            value={draft.temperature}
            min={MIN_TEMPERATURE}
            max={MAX_TEMPERATURE}
            step={TEMPERATURE_STEP}
            showTicks
            showTooltip
            formatValue={formatTemperature}
            rightContent={
              <NumberInput
                aria-label={t(QuickAppEditorI18nKeys.TemperatureValue)}
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
            label: t(QuickAppEditorI18nKeys.MaxAttachmentsUserCanAdd),
            htmlFor: maxAttachmentsId,
          }}
          value={draft.maxInputAttachments?.toString() ?? ''}
          onChange={handleMaxAttachmentsChange}
          integer
          min={1}
          caption={t(QuickAppEditorI18nKeys.MaxAttachmentsHint)}
          placeholder={t(QuickAppEditorI18nKeys.MaxAttachmentsPlaceholder)}
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

        {isProcessLargeFilesAvailable && (
          <Switch
            isOn={draft.processLargeFiles}
            onChange={handleProcessLargeFilesChange}
            labelProps={{ label: t(QuickAppEditorI18nKeys.AllowOrchestratorToProcessFiles) }}
            caption={t(QuickAppEditorI18nKeys.ProcessFilesOnDemandDescription)}
          />
        )}
      </div>
    </Popup>
  );
};

export default memo(AdvancedSettingsPopup);
