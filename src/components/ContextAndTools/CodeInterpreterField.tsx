import { FC } from 'react';
import { useTranslation } from '@/hooks/use-translation';
import { Translation } from '@/types/translation';
import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useAppContext } from '@/context/AppContext';
import { Switch } from '@epam/ai-dial-ui-kit';

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
  const { t } = useTranslation(Translation.QuickAppEditor);
  const { settings } = useAppContext();

  if (!settings.isCodeInterpreterEnabled) return null;

  return (
    <Switch
      isOn={value}
      onChange={onChange}
      disabled={disabled}
      labelProps={{
        label: t(QuickAppEditorI18nKeys.UseToExecuteCustomPythonCode),
        caption: tooltip,
      }}
      className="relative"
    />
  );
};
