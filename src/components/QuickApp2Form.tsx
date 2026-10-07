import { FC, useCallback, useEffect, useMemo } from 'react';

import { DIAL_EDITOR_TRIGGER_SAVE_EVENT } from '@/constants/editor';
import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useAppContext } from '@/context/AppContext';
import { useDataContext } from '@/context/DataContext';
import { getQuickApp2FormData } from '@/form/quickApp2Form';
import { useQuickApp2Form } from '@/hooks/use-quick-app2-form';
import type { QuickApp2FormValues, QuickApp2ModelStatus } from '@/types/quick-app-form';
import { QuickApp2ModelStatus as ModelStatus } from '@/types/quick-app-form';
import type { TriggerSaveGeneralPayload } from '@/types/editor-messages';
import type { QuickApp2Form as QuickApp2FormType } from '@/form/quickApp2Form';
import type { QuickApp2Config } from '@/types/quick-apps';
import type { AdvancedSettingsValues } from '@/types/advanced-settings';
import type { ConversationStartersValues } from '@/types/conversation-starters';
import type { LocalizedText } from '@/types/dial-entities';
import { Translation } from '@/types/translation';
import { useTranslation } from '@/hooks/use-translation';
import { DialAIEntityModel } from '@/utils/application';

import AddOnsSection from './AddOns/AddOnsSection';
import InstructionsSection from './InstructionsSection/InstructionsSection';
import ModelConfigurationSection from './Orchestrator/ModelConfigurationSection/ModelConfigurationSection';
import QuickApp2FormLegacyFields from './QuickApp2FormLegacyFields/QuickApp2FormLegacyFields';

export type QuickApp2AllEntitiesMap = Record<
  string,
  DialAIEntityModel & { id: string; name?: LocalizedText; type?: string }
>;

interface QuickApp2FormProps {
  onSave: (
    data: QuickApp2FormType,
    allEntitiesMap: QuickApp2AllEntitiesMap,
    isAutoSave?: boolean,
    general?: TriggerSaveGeneralPayload,
  ) => void;
  onDirtyChange?: (isDirty: boolean) => void;
  /** Called once a model is resolved for the form — either the app's saved model or the default. */
  onModelReady?: () => void;
  readonly?: boolean;
}

export const QuickApp2Form: FC<QuickApp2FormProps> = ({
  onSave,
  onDirtyChange,
  onModelReady,
  readonly,
}) => {
  const { t } = useTranslation(Translation.QuickAppEditor);
  const { app, settings } = useAppContext();
  const { models, modelsMap, toolsetsMap, mcpAgentsMap, status } = useDataContext();

  const toolSupportingModelIds = useMemo(
    () => models.filter((model) => model.features?.tools).map((model) => model.id),
    [models],
  );
  const availableModelIds = useMemo(() => models.map((model) => model.id), [models]);
  const sharedTooltip = app.isShared
    ? t(QuickAppEditorI18nKeys.CannotChangeSharedApp, { context: 'field' })
    : undefined;
  const isReadonly = readonly || !!app.isShared;
  const defaultValues = getQuickApp2FormData(
    app,
    toolSupportingModelIds,
    availableModelIds,
    settings.defaultModelId,
  );
  const {
    values,
    errors,
    isDirty,
    isModelReady,
    setField,
    setValues,
    syncExternalState,
    submit,
    setAgentIds,
    configureAgent,
  } = useQuickApp2Form({ defaultValues });

  const modelStatus = useMemo<QuickApp2ModelStatus>(() => {
    switch (status) {
      case 'loading':
        return ModelStatus.Loading;
      case 'ready':
        return ModelStatus.Ready;
      case 'error':
        return ModelStatus.Error;
      default:
        return ModelStatus.Idle;
    }
  }, [status]);

  const existingModelId = (app.applicationProperties as QuickApp2Config | undefined)?.orchestrator
    ?.deployment?.deployment_id;

  useEffect(() => {
    syncExternalState({
      modelStatus,
      toolSupportingModelIds,
      availableModelIds,
      existingModelId,
      defaultModelId: settings.defaultModelId,
      isCodeInterpreterEnabled: !!settings.isCodeInterpreterEnabled,
      isWebFetchEnabled: !!settings.isWebFetchEnabled,
      isAddAttachmentEnabled: !!settings.isAddAttachmentEnabled,
      shouldValidate: true,
    });
  }, [
    availableModelIds,
    existingModelId,
    modelStatus,
    settings.defaultModelId,
    settings.isAddAttachmentEnabled,
    settings.isCodeInterpreterEnabled,
    settings.isWebFetchEnabled,
    syncExternalState,
    toolSupportingModelIds,
  ]);

  useEffect(() => {
    if (isModelReady) onModelReady?.();
  }, [isModelReady, onModelReady]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const allEntitiesMap = useMemo(
    // MCP agents are separate from the model map but are valid toolset entities.
    () => ({ ...modelsMap, ...toolsetsMap, ...mcpAgentsMap }),
    [mcpAgentsMap, modelsMap, toolsetsMap],
  );

  const isProcessLargeFilesAvailable = !!modelsMap[values.model]?.inputAttachmentTypes?.length;

  const handleSubmitForm = useCallback(
    (isAutoSave = false, general?: TriggerSaveGeneralPayload) => {
      const result = submit();
      if (!result.isValid) return;
      onSave(result.data, allEntitiesMap, isAutoSave, general);
    },
    [allEntitiesMap, onSave, submit],
  );

  useEffect(() => {
    const handleTriggerSave = (event: Event) => {
      const { isAutoSave, ignoreDirty, general } =
        (event as CustomEvent<{
          isAutoSave?: boolean;
          ignoreDirty?: boolean;
          general?: TriggerSaveGeneralPayload;
        }>).detail ?? {};
      if (isReadonly) return;
      if (isAutoSave && !ignoreDirty && !isDirty) return;
      handleSubmitForm(!!isAutoSave, general);
    };

    window.addEventListener(DIAL_EDITOR_TRIGGER_SAVE_EVENT, handleTriggerSave);
    return () => window.removeEventListener(DIAL_EDITOR_TRIGGER_SAVE_EVENT, handleTriggerSave);
  }, [handleSubmitForm, isDirty, isReadonly]);

  const handleLegacyValuesChange = useCallback(
    (legacyValues: Partial<QuickApp2FormValues>) => setValues(legacyValues),
    [setValues],
  );
  const advancedSettings = useMemo<AdvancedSettingsValues>(
    () => ({
      maxInputAttachments: values.maxInputAttachments,
      timestamp: values.timestamp,
      fileTools: values.fileTools,
    }),
    [values.fileTools, values.maxInputAttachments, values.timestamp],
  );
  const handleAdvancedSettingsSave = useCallback(
    (nextAdvancedSettings: AdvancedSettingsValues) => setValues(nextAdvancedSettings),
    [setValues],
  );
  const conversationStarters = useMemo<ConversationStartersValues>(
    () => ({
      starters: values.starters,
      introText: values.introText,
      autoSubmit: values.autoSubmit,
      chatMessageInputDisabled: values.chatMessageInputDisabled,
    }),
    [values.autoSubmit, values.chatMessageInputDisabled, values.introText, values.starters],
  );
  const handleConversationStartersSave = useCallback(
    (nextConversationStarters: ConversationStartersValues) => setValues(nextConversationStarters),
    [setValues],
  );
  const handleAttachmentsEnabledChange = useCallback(
    (isEnabled: boolean) => {
      if (isEnabled) {
        setField('attachmentsEnabled', true);
        return;
      }
      setValues({ attachmentsEnabled: false, inputAttachmentTypes: [] });
    },
    [setField, setValues],
  );
  const handleInputAttachmentTypesChange = useCallback(
    (mimeTypes: string[]) => setField('inputAttachmentTypes', mimeTypes),
    [setField],
  );

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmitForm();
      }}
      className="grid grid-cols-1 gap-4 desktop:grid-cols-[minmax(0,1fr)_minmax(280px,440px)] desktop:gap-x-0"
    >
      <div className="min-w-0 flex flex-col min-h-0 gap-4">
        <InstructionsSection
          value={values.instructions}
          onChange={(value) => setField('instructions', value)}
        />

        <AddOnsSection
          agentSkills={values.agentSkills}
          onAgentSkillsChange={(value) => setField('agentSkills', value)}
          isReadonly={isReadonly}
          tooltip={sharedTooltip}
          agentsAndToolsets={values.agentsAndToolsets}
          onAgentsChange={setAgentIds}
          onConfigureAgent={configureAgent}
          conversationStarters={conversationStarters}
          onConversationStartersSave={handleConversationStartersSave}
        />

        <QuickApp2FormLegacyFields
          values={values}
          isReadonly={isReadonly}
          tooltip={sharedTooltip}
          isCodeInterpreterEnabled={!!settings.isCodeInterpreterEnabled}
          isWebFetchEnabled={!!settings.isWebFetchEnabled}
          isAddAttachmentEnabled={!!settings.isAddAttachmentEnabled}
          onValuesChange={handleLegacyValuesChange}
        />
      </div>

      <ModelConfigurationSection
        model={values.model}
        onModelChange={(value) => setField('model', value)}
        temperature={values.temperature}
        onTemperatureChange={(value) => setField('temperature', value)}
        processLargeFiles={values.processLargeFiles}
        onProcessLargeFilesChange={(value) => setField('processLargeFiles', value)}
        errors={errors}
        isReadonly={isReadonly}
        tooltip={sharedTooltip}
        isProcessLargeFilesAvailable={isProcessLargeFilesAvailable}
        advancedSettings={advancedSettings}
        onAdvancedSettingsSave={handleAdvancedSettingsSave}
        attachmentsEnabled={values.attachmentsEnabled}
        onAttachmentsEnabledChange={handleAttachmentsEnabledChange}
        inputAttachmentTypes={values.inputAttachmentTypes}
        onInputAttachmentTypesChange={handleInputAttachmentTypesChange}
      />
    </form>
  );
};
