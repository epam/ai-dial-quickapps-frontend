import { FC, memo } from 'react';
import { Control, Controller, FieldErrors } from 'react-hook-form';

import { MarketplaceI18nKeys } from '@/constants/i18n';
import { QuickApp2Form as QuickApp2FormType } from '@/form/quickApp2Form';
import { useTranslation } from '@/hooks/useTranslation';
import { AnyToolset, DialAppTransportType } from '@/types/quick-apps';
import { Translation } from '@/types/translation';
import { decodeFileUrl } from '@/utils/decode-file-url';

import { FilesSelector } from '@/components/common/FilesSelector/FilesSelector';
import { FormCollapsibleSection } from '@/components/common/FormCollapsibleSection';
import { ToggleSwitch } from '@/components/common/ToggleSwitch/ToggleSwitch';

import { AgentsAndToolsetsField } from './AgentsAndToolsetsField';
import { CodeInterpreterField } from './CodeInterpreterField';

import { DialFormItem } from '@epam/ai-dial-ui-kit';

export interface ContextAndToolsSectionProps {
  control: Control<QuickApp2FormType>;
  errors: FieldErrors<QuickApp2FormType>;
  isReadonly: boolean;
  tooltip?: string;
  isCodeInterpreterEnabled: boolean;
  agentsAndToolsets: QuickApp2FormType['agentsAndToolsets'];
  agentsAndToolsetsJson: string;
  isJsonView: boolean;
  onAgentsChange: (ids: string[]) => void;
  onJsonChange: (json: string) => void;
  onSwitchToJsonView: () => void;
  onSwitchToSimpleView: (toolsets: AnyToolset[]) => void;
  onDiscardJson: () => void;
  onConfigureAgent: (id: string, transport: DialAppTransportType) => void;
}

const ContextAndToolsSection: FC<ContextAndToolsSectionProps> = ({
  control,
  errors,
  isReadonly,
  tooltip,
  isCodeInterpreterEnabled,
  agentsAndToolsets,
  agentsAndToolsetsJson,
  isJsonView,
  onAgentsChange,
  onJsonChange,
  onSwitchToJsonView,
  onSwitchToSimpleView,
  onDiscardJson,
  onConfigureAgent,
}) => {
  const { t } = useTranslation(Translation.Marketplace);

  return (
    <FormCollapsibleSection
      name={t(MarketplaceI18nKeys.ContextAndTools)}
      description={t(MarketplaceI18nKeys.ContextAndToolsDescription)}
      openByDefault
    >
      <DialFormItem label={t(MarketplaceI18nKeys.AgentsAndToolsets)}>
        <AgentsAndToolsetsField
          agentsAndToolsets={agentsAndToolsets}
          agentsAndToolsetsJson={agentsAndToolsetsJson}
          isJsonView={isJsonView}
          onAgentsChange={onAgentsChange}
          onJsonChange={onJsonChange}
          onSwitchToJsonView={onSwitchToJsonView}
          onSwitchToSimpleView={onSwitchToSimpleView}
          onDiscardJson={onDiscardJson}
          onConfigureAgent={onConfigureAgent}
          readonly={isReadonly}
          tooltip={tooltip}
          jsonError={errors.agentsAndToolsetsJson?.message}
        />
      </DialFormItem>

      <DialFormItem
        label={t(MarketplaceI18nKeys.ContextFiles)}
        description={t(MarketplaceI18nKeys.ContextFilesInfo)}
      >
        <Controller
          control={control}
          name="documentRelativeUrl"
          render={({ field }) => (
            <FilesSelector
              files={field.value}
              readonly={isReadonly}
              tooltip={tooltip}
              onRemoveFile={(doc) => field.onChange(field.value.filter((f) => f !== doc))}
              onAddFiles={(docs) => field.onChange(docs.map(decodeFileUrl))}
            />
          )}
        />
      </DialFormItem>

      {isCodeInterpreterEnabled && (
        <DialFormItem
          label={t(MarketplaceI18nKeys.CodeInterpreter)}
          description={t(MarketplaceI18nKeys.CodeInterpreterInfo)}
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

      <DialFormItem
        label={t(MarketplaceI18nKeys.FileTools)}
        description={t(MarketplaceI18nKeys.FileToolsDescription)}
        className="!py-0"
      >
        <Controller
          control={control}
          name="fileTools"
          render={({ field }) => (
            <ToggleSwitch
              isOn={field.value}
              handleSwitch={() => field.onChange(!field.value)}
              disabled={isReadonly}
              additionalText={t(MarketplaceI18nKeys.AllowTheAgentToAccessAppFiles)}
              className="flex items-center gap-2"
              tooltip={tooltip}
            />
          )}
        />
      </DialFormItem>

      <DialFormItem
        label={t(MarketplaceI18nKeys.AddAttachment)}
        description={t(MarketplaceI18nKeys.AddAttachmentDescription)}
        className="!py-0"
      >
        <Controller
          control={control}
          name="addAttachment"
          render={({ field }) => (
            <ToggleSwitch
              isOn={field.value}
              handleSwitch={() => field.onChange(!field.value)}
              disabled={isReadonly}
              additionalText={t(MarketplaceI18nKeys.AllowTheAgentToAttachFilesToTheResponse)}
              className="flex items-center gap-2"
              tooltip={tooltip}
            />
          )}
        />
      </DialFormItem>

      <DialFormItem
        label={t(MarketplaceI18nKeys.WebFetch)}
        description={t(MarketplaceI18nKeys.WebFetchDescription)}
        className="!py-0"
      >
        <Controller
          control={control}
          name="webFetch"
          render={({ field }) => (
            <ToggleSwitch
              isOn={field.value}
              handleSwitch={() => field.onChange(!field.value)}
              disabled={isReadonly}
              additionalText={t(MarketplaceI18nKeys.AllowTheAgentToFetchWebResources)}
              className="flex items-center gap-2"
              tooltip={tooltip}
            />
          )}
        />
      </DialFormItem>
    </FormCollapsibleSection>
  );
};

export default memo(ContextAndToolsSection);
