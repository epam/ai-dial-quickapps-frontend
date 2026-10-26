import { FC, memo } from 'react';

import { ApplicationEditorI18nKeys } from '@/constants/translation-keys';
import { useTranslation } from 'react-i18next';

import { FormSection, FormSectionVariant, Switch } from '@epam/ai-dial-ui-kit';

export interface CodeInterpreterSectionProps {
  isEnabled: boolean;
  onEnabledChange: (isEnabled: boolean) => void;
}

const CodeInterpreterSection: FC<CodeInterpreterSectionProps> = ({
  isEnabled,
  onEnabledChange,
}) => {
  const { t } = useTranslation();

  return (
    <FormSection
      title={t(ApplicationEditorI18nKeys.CodeInterpreterTitle)}
      description={t(ApplicationEditorI18nKeys.CodeInterpreterDescription)}
      variant={FormSectionVariant.Setting}
      action={
        <Switch
          isOn={isEnabled}
          onChange={onEnabledChange}
          aria-label={t(ApplicationEditorI18nKeys.CodeInterpreterTitle)}
        />
      }
    />
  );
};

export default memo(CodeInterpreterSection);
