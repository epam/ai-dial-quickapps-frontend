import { IconSettings } from '@tabler/icons-react';
import { FC, memo, useCallback, useState } from 'react';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useTranslation } from '@/hooks/use-translation';
import type { AdvancedSettingsValues } from '@/types/advanced-settings';
import { SectionRowVariant } from '@/types/section-row';
import { Translation } from '@/types/translation';

import { SectionRow } from '@/components/common/SectionRow/SectionRow';

import AdvancedSettingsPopup from '../AdvancedSettingsPopup/AdvancedSettingsPopup';

import {
  Button,
  ButtonAppearance,
  ButtonVariant,
  DIAL_ICON_SIZE,
  DIAL_KIT_ICON_STROKE,
  ElementSize,
} from '@epam/ai-dial-ui-kit';

export interface SettingsSectionProps {
  isReadonly: boolean;
  advancedSettings: AdvancedSettingsValues;
  isTemperatureAvailable: boolean;
  isProcessLargeFilesAvailable: boolean;
  isCodeInterpreterEnabled: boolean;
  isAddAttachmentEnabled: boolean;
  isWebFetchEnabled: boolean;
  maxInputAttachmentsError?: string;
  onAdvancedSettingsSave: (values: AdvancedSettingsValues) => void;
}

const SettingsSection: FC<SettingsSectionProps> = ({
  isReadonly,
  onAdvancedSettingsSave,
  ...popupProps
}) => {
  const { t } = useTranslation(Translation.QuickAppEditor);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  const handleOpen = useCallback(() => setIsPopupOpen(true), []);
  const handleClose = useCallback(() => setIsPopupOpen(false), []);

  return (
    <>
      <SectionRow
        title={t(QuickAppEditorI18nKeys.Settings)}
        variant={SectionRowVariant.Caption}
        action={
          <Button
            label={t(QuickAppEditorI18nKeys.Advanced)}
            iconBefore={
              <IconSettings
                size={DIAL_ICON_SIZE.SM}
                stroke={DIAL_KIT_ICON_STROKE}
                aria-hidden="true"
              />
            }
            variant={ButtonVariant.Primary}
            appearance={ButtonAppearance.Link}
            size={ElementSize.Small}
            disabled={isReadonly}
            onClick={handleOpen}
          />
        }
      />
      {isPopupOpen && (
        // Mounted only while open so every open re-seeds the popup draft from the form.
        <AdvancedSettingsPopup
          {...popupProps}
          isOpen
          onSave={onAdvancedSettingsSave}
          onClose={handleClose}
        />
      )}
    </>
  );
};

export default memo(SettingsSection);
