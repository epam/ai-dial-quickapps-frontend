import { FC, memo } from 'react';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useTranslation } from '@/hooks/useTranslation';
import { Translation } from '@/types/translation';

import { FormCollapsibleSection } from '@/components/common/FormCollapsibleSection';
import { ToggleSwitch } from '@/components/common/ToggleSwitch/ToggleSwitch';

export interface AdvancedSettingsSectionProps {
  value: boolean;
  onChange: (value: boolean) => void;
  isReadonly: boolean;
  tooltip?: string;
}

const AdvancedSettingsSection: FC<AdvancedSettingsSectionProps> = ({
  value,
  onChange,
  isReadonly,
  tooltip,
}) => {
  const { t } = useTranslation(Translation.QuickAppEditor);

  return (
    <FormCollapsibleSection name={t(QuickAppEditorI18nKeys.AdvancedSettings)}>
      <ToggleSwitch
        isOn={value}
        handleSwitch={() => onChange(!value)}
        disabled={isReadonly}
        additionalText={t(QuickAppEditorI18nKeys.TimeAwareness)}
        className="flex items-center gap-2"
        tooltip={tooltip}
      />
    </FormCollapsibleSection>
  );
};

export default memo(AdvancedSettingsSection);
