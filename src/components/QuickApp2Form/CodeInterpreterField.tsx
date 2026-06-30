'use client';
import { FC } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { Translation } from '@/types/translation';
import { MarketplaceI18nKeys } from '@/constants/i18n';
import { useAppContext } from '@/context/AppContext';
import { ToggleSwitch } from '@/components/common/ToggleSwitch/ToggleSwitch';

interface CodeInterpreterFieldProps {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  tooltip?: string;
}

export const CodeInterpreterField: FC<CodeInterpreterFieldProps> = ({
  value,
  onChange,
  disabled,
  tooltip,
}) => {
  const { t } = useTranslation(Translation.Marketplace);
  const { settings } = useAppContext();

  if (!settings.isCodeInterpreterEnabled) return null;

  return (
    <ToggleSwitch
      isOn={value}
      handleSwitch={() => onChange(!value)}
      disabled={disabled}
      additionalText={t(MarketplaceI18nKeys.UseToExecuteCustomPythonCode)}
      className="flex items-center gap-2"
      tooltip={tooltip}
    />
  );
};
