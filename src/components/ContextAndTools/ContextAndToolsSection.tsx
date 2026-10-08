import { FC, memo } from 'react';
import { Control, Controller } from 'react-hook-form';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { QuickApp2Form as QuickApp2FormType } from '@/form/quickApp2Form';
import { useTranslation } from '@/hooks/use-translation';
import { Translation } from '@/types/translation';

import { FormCollapsibleSection } from '@/components/common/FormCollapsibleSection';

import { CodeInterpreterField } from './CodeInterpreterField';

import { DialFormItem, Switch } from '@epam/ai-dial-ui-kit';

export interface ContextAndToolsSectionProps {
  control: Control<QuickApp2FormType>;
  isReadonly: boolean;
  tooltip?: string;
  isCodeInterpreterEnabled: boolean;
  isWebFetchEnabled: boolean;
  isAddAttachmentEnabled: boolean;
}

const ContextAndToolsSection: FC<ContextAndToolsSectionProps> = ({
  control,
  isReadonly,
  tooltip,
  isCodeInterpreterEnabled,
  isWebFetchEnabled,
  isAddAttachmentEnabled,
}) => {
  const { t } = useTranslation(Translation.QuickAppEditor);

  return (
    <FormCollapsibleSection
      name={t(QuickAppEditorI18nKeys.ContextAndTools)}
      description={t(QuickAppEditorI18nKeys.ContextAndToolsDescription)}
      openByDefault
    >
      {isCodeInterpreterEnabled && (
        <DialFormItem
          label={t(QuickAppEditorI18nKeys.CodeInterpreter)}
          description={t(QuickAppEditorI18nKeys.CodeInterpreterInfo)}
          className="!py-0"
        >
          <Controller
            control={control}
            name="codeInterpreter"
            render={({ field }) => (
              <CodeInterpreterField
                value={field.value}
                onChange={field.onChange}
                disabled={isReadonly}
                tooltip={tooltip}
              />
            )}
          />
        </DialFormItem>
      )}

      {isAddAttachmentEnabled && (
        <DialFormItem
          label={t(QuickAppEditorI18nKeys.AddAttachment)}
          description={t(QuickAppEditorI18nKeys.AddAttachmentDescription)}
          className="!py-0"
        >
          <Controller
            control={control}
            name="addAttachment"
            render={({ field }) => (
              <Switch
                isOn={field.value}
                onChange={field.onChange}
                disabled={isReadonly}
                labelProps={{
                  label: t(QuickAppEditorI18nKeys.AllowTheAgentToAttachFilesToTheResponse),
                  caption: tooltip,
                }}
                className="relative"
              />
            )}
          />
        </DialFormItem>
      )}

      {isWebFetchEnabled && (
        <DialFormItem
          label={t(QuickAppEditorI18nKeys.WebFetch)}
          description={t(QuickAppEditorI18nKeys.WebFetchDescription)}
          className="!py-0"
        >
          <Controller
            control={control}
            name="webFetch"
            render={({ field }) => (
              <Switch
                isOn={field.value}
                onChange={field.onChange}
                disabled={isReadonly}
                labelProps={{
                  label: t(QuickAppEditorI18nKeys.AllowTheAgentToFetchWebResources),
                  caption: tooltip,
                }}
                className="relative"
              />
            )}
          />
        </DialFormItem>
      )}
    </FormCollapsibleSection>
  );
};

export default memo(ContextAndToolsSection);
