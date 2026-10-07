import { IconSettings } from '@tabler/icons-react';
import { FC, memo, useCallback, useState } from 'react';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useTranslation } from '@/hooks/useTranslation';
import { Translation } from '@/types/translation';

import AdvancedSettingsPopup from './AdvancedSettingsPopup';

import { Button, ButtonAppearance, ButtonVariant, ElementSize } from '@epam/ai-dial-ui-kit';

export interface SettingsSectionProps {
  isReadonly: boolean;
}

const SettingsSection: FC<SettingsSectionProps> = ({ isReadonly }) => {
  const { t } = useTranslation(Translation.QuickAppEditor);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  const handleOpen = useCallback(() => setIsPopupOpen(true), []);
  const handleClose = useCallback(() => setIsPopupOpen(false), []);

  return (
    // TODO: use the shared Section component instead of a raw <section>
    <section aria-labelledby="settings-heading" className="flex items-center justify-between gap-3 text-start">
      <h3 id="settings-heading" className="dial-small-semi-text">
        {t(QuickAppEditorI18nKeys.Settings)}
      </h3>
      <Button
        label={t(QuickAppEditorI18nKeys.Advanced)}
        iconBefore={<IconSettings size={16} />}
        variant={ButtonVariant.Primary}
        appearance={ButtonAppearance.Link}
        size={ElementSize.Small}
        disabled={isReadonly}
        onClick={handleOpen}
      />
      <AdvancedSettingsPopup isOpen={isPopupOpen} onClose={handleClose} />
    </section>
  );
};

export default memo(SettingsSection);
