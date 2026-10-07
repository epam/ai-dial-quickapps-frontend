import { FC, memo } from 'react';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useTranslation } from '@/hooks/useTranslation';
import { Translation } from '@/types/translation';

import { ButtonAppearance, ButtonVariant, Popup, PopupSize } from '@epam/ai-dial-ui-kit';

export interface AdvancedSettingsPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const AdvancedSettingsPopup: FC<AdvancedSettingsPopupProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation(Translation.QuickAppEditor);

  return (
    <Popup
      open={isOpen}
      size={PopupSize.Md}
      header={t(QuickAppEditorI18nKeys.AdvancedSettings)}
      closeAriaLabel={t(QuickAppEditorI18nKeys.CloseAdvancedSettings)}
      headerDivider
      footerDivider
      onClose={onClose}
      bodyClassName="min-h-[min(20rem,50vh)] max-w-full"
      additionalButtons={[{ label: t(QuickAppEditorI18nKeys.Close), onClick: onClose, variant: ButtonVariant.Primary, appearance: ButtonAppearance.Link }]}
      mainButtons={[{ label: t(QuickAppEditorI18nKeys.Save), variant: ButtonVariant.Neutral, onClick: onClose }]}
    >
      {null}
    </Popup>
  );
};

export default memo(AdvancedSettingsPopup);
