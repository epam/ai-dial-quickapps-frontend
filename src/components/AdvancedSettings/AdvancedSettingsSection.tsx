import { FC, memo } from 'react';
import { Control, Controller } from 'react-hook-form';

import { MarketplaceI18nKeys } from '@/constants/i18n';
import { QuickApp2Form as QuickApp2FormType } from '@/form/quickApp2Form';
import { useTranslation } from '@/hooks/useTranslation';
import { Translation } from '@/types/translation';

import { FormCollapsibleSection } from '@/components/common/FormCollapsibleSection';
import { ToggleSwitch } from '@/components/common/ToggleSwitch/ToggleSwitch';

export interface AdvancedSettingsSectionProps {
  control: Control<QuickApp2FormType>;
  isReadonly: boolean;
  tooltip?: string;
}

const AdvancedSettingsSection: FC<AdvancedSettingsSectionProps> = ({
  control,
  isReadonly,
  tooltip,
}) => {
  const { t } = useTranslation(Translation.Marketplace);

  return (
    <FormCollapsibleSection name={t(MarketplaceI18nKeys.AdvancedSettings)}>
      <Controller
        control={control}
        name="timestamp"
        render={({ field }) => (
          <ToggleSwitch
            isOn={field.value}
            handleSwitch={() => field.onChange(!field.value)}
            disabled={isReadonly}
            additionalText={t(MarketplaceI18nKeys.TimeAwareness)}
            className="flex items-center gap-2"
            tooltip={tooltip}
          />
        )}
      />
    </FormCollapsibleSection>
  );
};

export default memo(AdvancedSettingsSection);
