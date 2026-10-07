import { FC, memo } from 'react';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useTranslation } from '@/hooks/useTranslation';
import { Translation } from '@/types/translation';

import { FormCollapsibleSection } from '@/components/common/FormCollapsibleSection';

import { Switch } from '@epam/ai-dial-ui-kit';

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
      <Switch
        isOn={value}
        onChange={onChange}
        disabled={isReadonly}
        labelProps={{ label: t(QuickAppEditorI18nKeys.TimeAwareness), caption: tooltip }}
        className="relative"
      />
    </FormCollapsibleSection>
  );
};

export default memo(AdvancedSettingsSection);
