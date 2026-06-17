'use client';
import { FC, useCallback } from 'react';
import { useForm, Controller, type SubmitHandler } from 'react-hook-form';

import { useTranslation } from '@/hooks/useTranslation';
import { Translation } from '@/types/translation';
import { MarketplaceI18nKeys } from '@/constants/i18n';
import { useAppContext } from '@/context/AppContext';
import { useDataContext } from '@/context/DataContext';
import {
  QuickApp2Schema,
  type QuickApp2Form as QuickApp2FormType,
  AgentOrToolsetSchemaKeys,
  getQuickApp2FormData,
} from '@/form/quickApp2Form';
import { DialAppTransportType } from '@/types/quick-apps';
import { isApplicationId } from '@/utils/api';
import { doesAgentSupportMcp } from '@/utils/application';

import { FormCollapsibleSection } from '@/components/common/FormCollapsibleSection';
import { TemperatureSlider } from '@/components/common/Temperature';
import { FilesSelector } from '@/components/common/FilesSelector/FilesSelector';
import { DialMarkdownEditorContainer } from '@/components/common/MarkdownEditor/MarkdownEditorContainer';
import { MultipleComboBox } from '@/components/common/MultipleComboBox';
import { Field } from '@/components/common/Forms/Field';

import { ModelField } from './ModelField';
import { AgentsAndToolsetsField } from './AgentsAndToolsetsField';
import { CodeInterpreterField } from './CodeInterpreterField';
import { ConversationStartersList } from './ConversationStartersField';
import { StartersBehaviourRadioGroup } from './StartersBehaviourRadioGroup';
import { AgentSkillsField } from './AgentSkillsField';

import { ButtonVariant, DialButton, DialInput } from '@epam/ai-dial-ui-kit';

interface QuickApp2FormProps {
  onSave: (data: QuickApp2FormType) => void;
  onDiscard?: () => void;
  readonly?: boolean;
}

export const QuickApp2Form: FC<QuickApp2FormProps> = ({
  onSave,
  onDiscard,
  readonly,
}) => {
  const { t } = useTranslation(Translation.Marketplace);
  const { app, settings } = useAppContext();
  const { models, toolsets, modelsMap, toolsetsMap, files } = useDataContext();

  const toolSupportingModelIds = models
    .filter((m) => m.features?.tools)
    .map((m) => m.id);
  const availableModelIds = models.map((m) => m.id);

  const sharedTooltip = app.isShared
    ? t(MarketplaceI18nKeys.CannotChangeSharedApp, { context: 'field' })
    : undefined;

  const isReadonly = readonly || !!app.isShared;

  const defaultValues = getQuickApp2FormData(app, toolSupportingModelIds, availableModelIds);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<QuickApp2FormType>({ defaultValues });

  const isJsonView = watch('isJsonView');
  const starters = watch('starters');
  const agentsAndToolsets = watch('agentsAndToolsets');
  const agentsAndToolsetsJson = watch('agentsAndToolsetsJson');
  const model = watch('model');
  const codeInterpreter = watch('codeInterpreter');
  const agentSkills = watch('agentSkills');
  const chatMessageInputDisabled = watch('chatMessageInputDisabled');
  const autoSubmit = watch('autoSubmit');

  const hasNonEmptyStarters = starters.some(
    (s) => s.title.trim() || s.text.trim(),
  );

  const handleAgentsChange = useCallback(
    (ids: string[]) => {
      const currentMap: Record<string, QuickApp2FormType['agentsAndToolsets'][number]> =
        Object.fromEntries(
          agentsAndToolsets.map((a) => [a[AgentOrToolsetSchemaKeys.id], a]),
        );
      const next = ids.map((id) => {
        if (currentMap[id]) return currentMap[id];
        return { [AgentOrToolsetSchemaKeys.id]: id };
      });
      setValue('agentsAndToolsets', next as QuickApp2FormType['agentsAndToolsets']);
    },
    [agentsAndToolsets, setValue],
  );

  const handleConfigureAgent = useCallback(
    (id: string, transport: DialAppTransportType) => {
      const next = agentsAndToolsets.map((a) => {
        if (a[AgentOrToolsetSchemaKeys.id] !== id) return a;
        return {
          ...a,
          [AgentOrToolsetSchemaKeys.tool]: {
            ...(a[AgentOrToolsetSchemaKeys.tool] ?? {}),
            transport,
          },
        };
      });
      setValue('agentsAndToolsets', next as QuickApp2FormType['agentsAndToolsets']);
    },
    [agentsAndToolsets, setValue],
  );

  return (
    <form onSubmit={handleSubmit(onSave as SubmitHandler<QuickApp2FormType>)} className="flex flex-col">
      {/* Orchestrator section */}
      <FormCollapsibleSection
        name={t(MarketplaceI18nKeys.Orchestrator)}
        description={t(MarketplaceI18nKeys.OrchestratorDescription)}
        openByDefault
        dataQa="orchestrator-section"
      >
        {/* Model */}
        <div className="mb-4 flex flex-col gap-1">
          <label className="text-sm font-medium">
            {t(MarketplaceI18nKeys.ModelMarketplace)}
          </label>
          <Controller
            control={control}
            name="model"
            render={({ field }) => (
              <ModelField
                value={field.value}
                onChange={field.onChange}
                disabled={isReadonly}
                tooltip={sharedTooltip}
                error={errors.model?.message}
              />
            )}
          />
        </div>

        {/* Temperature */}
        <div className="mb-4 flex flex-col gap-1">
          <label className="text-sm font-medium">
            {t(MarketplaceI18nKeys.TemperatureMarketplace)}
          </label>
          <Controller
            control={control}
            name="temperature"
            render={({ field }) => (
              <TemperatureSlider
                temperature={field.value}
                onChangeTemperature={field.onChange}
                disabled={isReadonly}
                tooltip={sharedTooltip}
              />
            )}
          />
        </div>

        {/* Instructions */}
        <div className="mb-4 flex flex-col gap-1">
          <label className="text-sm font-medium">
            {t(MarketplaceI18nKeys.InstructionsMarketplace)}
          </label>
          <Controller
            control={control}
            name="instructions"
            render={({ field }) => (
              <DialMarkdownEditorContainer
                value={field.value}
                onChangeValue={field.onChange}
                placeholder={t(MarketplaceI18nKeys.InstructionsPlaceholder)}
              />
            )}
          />
        </div>
      </FormCollapsibleSection>

      {/* Context & Tools section */}
      <FormCollapsibleSection
        name={t(MarketplaceI18nKeys.ContextAndTools)}
        description={t(MarketplaceI18nKeys.ContextAndToolsDescription)}
        openByDefault
        dataQa="context-and-tools-section"
      >
        {/* Agents & Toolsets */}
        <div className="mb-4 flex flex-col gap-1">
          <label className="text-sm font-medium">
            {t(MarketplaceI18nKeys.AgentsAndToolsets)}
          </label>
          <AgentsAndToolsetsField
            agentsAndToolsets={agentsAndToolsets}
            agentsAndToolsetsJson={agentsAndToolsetsJson}
            isJsonView={isJsonView}
            onAgentsChange={handleAgentsChange}
            onJsonChange={(json) => setValue('agentsAndToolsetsJson', json)}
            onJsonViewChange={(v) => setValue('isJsonView', v)}
            onConfigureAgent={handleConfigureAgent}
            readonly={isReadonly}
            tooltip={sharedTooltip}
            jsonError={errors.agentsAndToolsetsJson?.message}
          />
        </div>

        {/* Context files */}
        <div className="mb-4 flex flex-col gap-1">
          <label className="text-sm font-medium">
            {t(MarketplaceI18nKeys.ContextFiles)}
          </label>
          <Controller
            control={control}
            name="documentRelativeUrl"
            render={({ field }) => (
              <FilesSelector
                files={field.value}
                readonly={isReadonly}
                tooltip={sharedTooltip}
                onRemoveFile={(doc) =>
                  field.onChange(field.value.filter((f) => f !== doc))
                }
                onAddFiles={(docs) =>
                  field.onChange([...field.value, ...docs])
                }
              />
            )}
          />
        </div>

        {/* Code Interpreter */}
        {settings.isCodeInterpreterEnabled && (
          <div className="mb-4 flex flex-col gap-1">
            <label className="text-sm font-medium">
              {t(MarketplaceI18nKeys.CodeInterpreter)}
            </label>
            <Controller
              control={control}
              name="codeInterpreter"
              render={({ field }) => (
                <CodeInterpreterField
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isReadonly}
                  tooltip={sharedTooltip}
                />
              )}
            />
          </div>
        )}
      </FormCollapsibleSection>

      {/* Agent Skills section */}
      <FormCollapsibleSection
        name={t(MarketplaceI18nKeys.AgentSkills)}
        description={t(MarketplaceI18nKeys.AgentSkillsDescription)}
        dataQa="agent-skills-section"
      >
        <Controller
          control={control}
          name="agentSkills"
          render={({ field }) => (
            <AgentSkillsField
              value={field.value}
              onChange={field.onChange}
              readonly={isReadonly}
              tooltip={sharedTooltip}
            />
          )}
        />
      </FormCollapsibleSection>

      {/* User Attachments section */}
      <FormCollapsibleSection
        name={t(MarketplaceI18nKeys.UserAttachments)}
        description={t(MarketplaceI18nKeys.UserAttachmentsDescription)}
        dataQa="user-attachments-section"
      >
        {/* Attachment types */}
        <div className="mb-4 flex flex-col gap-1">
          <label className="text-sm font-medium">
            {t(MarketplaceI18nKeys.AttachmentTypes)}
          </label>
          <Controller
            control={control}
            name="inputAttachmentTypes"
            render={({ field }) => (
              <MultipleComboBox<string>
                initialSelectedItems={field.value}
                onChangeSelectedItems={field.onChange}
                getItemLabel={(item) => item}
                getItemValue={(item) => item}
                disabled={isReadonly}
                placeholder={t(MarketplaceI18nKeys.InputMIMEType)}
                tooltip={sharedTooltip}
              />
            )}
          />
        </div>

        {/* Max attachments */}
        <div className="mb-4 flex flex-col gap-1">
          <label className="text-sm font-medium">
            {t(MarketplaceI18nKeys.MaxAttachmentsNumber)}
          </label>
          <Controller
            control={control}
            name="maxInputAttachments"
            render={({ field }) => (
              <Field
                value={field.value?.toString() ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  field.onChange(val ? Number(val) : undefined);
                }}
                type="number"
                min={1}
                disabled={isReadonly}
                title={sharedTooltip}
                placeholder={t(MarketplaceI18nKeys.EnterMaxAttachments)}
                error={errors.maxInputAttachments?.message as string | undefined}
              />
            )}
          />
        </div>
      </FormCollapsibleSection>

      {/* Conversation Starters section */}
      <FormCollapsibleSection
        name={t(MarketplaceI18nKeys.ConversationStarters)}
        description={t(MarketplaceI18nKeys.StartersDescription)}
        dataQa="conversation-starters-section"
      >
        {/* Intro text */}
        <div className="mb-4 flex flex-col gap-1">
          <label className="text-sm font-medium">
            {t(MarketplaceI18nKeys.IntroText)}
          </label>
          <Controller
            control={control}
            name="introText"
            render={({ field }) => (
              <DialInput
                value={field.value ?? ''}
                onChange={(val) => field.onChange(val ?? '')}
                disabled={isReadonly}
                placeholder={t(MarketplaceI18nKeys.EnterIntroText)}
                containerClassName="w-full"
              />
            )}
          />
          <p className="text-xs text-secondary">
            {t(MarketplaceI18nKeys.OptionalTextShownAboveTheStarters)}
          </p>
        </div>

        {/* Starters list */}
        <div className="mb-4">
          <Controller
            control={control}
            name="starters"
            render={({ field }) => (
              <ConversationStartersList
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                disabled={isReadonly}
              />
            )}
          />
        </div>

        {/* Starters settings */}
        {hasNonEmptyStarters && (
          <FormCollapsibleSection
            name={t(MarketplaceI18nKeys.StartersSettings)}
            dataQa="starters-settings"
          >
            {/* Disable chat input */}
            <div className="mb-4 flex items-center gap-3">
              <Controller
                control={control}
                name="chatMessageInputDisabled"
                render={({ field }) => (
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    disabled={isReadonly}
                    className="accent-accent"
                  />
                )}
              />
              <div>
                <p className="text-sm font-medium">
                  {t(MarketplaceI18nKeys.DisableChatInput)}
                </p>
                <p className="text-xs text-secondary">
                  {t(MarketplaceI18nKeys.DisableChatInputSoUsersCanOnlyUseStarters)}
                </p>
              </div>
            </div>

            {/* Starters behavior */}
            <div className="mb-4 flex flex-col gap-2">
              <label className="text-sm font-medium">
                {t(MarketplaceI18nKeys.StartersBehavior)}
              </label>
              <Controller
                control={control}
                name="autoSubmit"
                render={({ field }) => (
                  <StartersBehaviourRadioGroup
                    value={field.value}
                    onChange={field.onChange}
                    disabled={isReadonly}
                    tooltip={sharedTooltip}
                  />
                )}
              />
            </div>
          </FormCollapsibleSection>
        )}
      </FormCollapsibleSection>

      {/* Advanced settings */}
      <FormCollapsibleSection
        name={t(MarketplaceI18nKeys.AdvancedSettings)}
        dataQa="advanced-settings-section"
      >
        {/* Time awareness */}
        <div className="flex items-center gap-3">
          <Controller
            control={control}
            name="timestamp"
            render={({ field }) => (
              <input
                type="checkbox"
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                disabled={isReadonly}
                className="accent-accent"
              />
            )}
          />
          <label className="text-sm font-medium">
            {t(MarketplaceI18nKeys.TimeAwareness)}
          </label>
        </div>
      </FormCollapsibleSection>

      {/* Form actions */}
      {!readonly && (
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-primary bg-layer-1 px-5 py-3">
          {onDiscard && (
            <DialButton variant={ButtonVariant.Secondary} onClick={onDiscard} type="button">
              {t(MarketplaceI18nKeys.DiscardMarketplace)}
            </DialButton>
          )}
          <DialButton variant={ButtonVariant.Primary} type="submit">
            {t(MarketplaceI18nKeys.ApplyChanges)}
          </DialButton>
        </div>
      )}
    </form>
  );
};
