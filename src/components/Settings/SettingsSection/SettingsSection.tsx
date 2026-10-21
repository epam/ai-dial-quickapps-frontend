import { IconSettings } from '@tabler/icons-react';
import { FC, memo, useCallback, useState } from 'react';

import { ApplicationEditorI18nKeys, BasicI18nKeys } from '@/constants/translation-keys';
import { useTranslation } from 'react-i18next';
import type { AdvancedSettingsValues } from '@/types/advanced-settings';
import { SectionRowVariant } from '@/types/section-row';

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
  advancedSettings: AdvancedSettingsValues;
  isTemperatureAvailable: boolean;
  isProcessLargeFilesAvailable: boolean;
  isCodeInterpreterEnabled: boolean;
  isAddAttachmentEnabled: boolean;
  isWebFetchEnabled: boolean;
  isAttachmentsEnabled: boolean;
  maxInputAttachmentsError?: string;
  onAdvancedSettingsSave: (values: AdvancedSettingsValues) => void;
}

const SettingsSection: FC<SettingsSectionProps> = ({ onAdvancedSettingsSave, ...popupProps }) => {
  const { t } = useTranslation();
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  const handleOpen = useCallback(() => setIsPopupOpen(true), []);
  const handleClose = useCallback(() => setIsPopupOpen(false), []);

  return (
    <>
      <SectionRow
        title={t(BasicI18nKeys.Settings)}
        variant={SectionRowVariant.Caption}
        action={
          <Button
            label={t(ApplicationEditorI18nKeys.AdvancedSettingsAdvanced)}
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
