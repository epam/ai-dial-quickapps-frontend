import { FC, useCallback, useEffect, useMemo } from 'react';

import { DIAL_EDITOR_TRIGGER_SAVE_EVENT } from '@/constants/editor';
import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useAppContext } from '@/context/AppContext';
import { useDataContext } from '@/context/DataContext';
import { getQuickApp2FormData } from '@/form/quickApp2Form';
import { useQuickApp2Form } from '@/hooks/use-quick-app2-form';
import type { TriggerSaveEventDetail, TriggerSaveGeneralPayload } from '@/types/editor-messages';
import type { QuickApp2Form as QuickApp2FormType } from '@/form/quickApp2Form';
import type { QuickApp2Config } from '@/types/quick-apps';
import type { AdvancedSettingsValues } from '@/types/advanced-settings';
import type { ConversationStartersValues } from '@/types/conversation-starters';
import type { DialAIEntityModel, LocalizedText } from '@/types/dial-entities';
import { Translation } from '@/types/translation';
import { useTranslation } from '@/hooks/use-translation';

import AddOnsSection from './AddOns/AddOnsSection';
import InstructionsSection from './InstructionsSection/InstructionsSection';
import ModelConfigurationSection from './Orchestrator/ModelConfigurationSection/ModelConfigurationSection';

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
    addDocuments,
    removeDocument,
  } = useQuickApp2Form({ defaultValues });

  const existingModelId = (app.applicationProperties as QuickApp2Config | undefined)?.orchestrator
    ?.deployment?.deployment_id;

  useEffect(() => {
    syncExternalState({
      modelStatus: status,
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
    settings.defaultModelId,
    status,
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
        (event as CustomEvent<TriggerSaveEventDetail>).detail ?? {};
      if (isReadonly) return;
      if (isAutoSave && !ignoreDirty && !isDirty) return;
      handleSubmitForm(!!isAutoSave, general);
    };

    window.addEventListener(DIAL_EDITOR_TRIGGER_SAVE_EVENT, handleTriggerSave);
    return () => window.removeEventListener(DIAL_EDITOR_TRIGGER_SAVE_EVENT, handleTriggerSave);
  }, [handleSubmitForm, isDirty, isReadonly]);

  const advancedSettings = useMemo<AdvancedSettingsValues>(
    () => ({
      temperature: values.temperature,
      maxInputAttachments: values.maxInputAttachments,
      timestamp: values.timestamp,
      fileTools: values.fileTools,
      processLargeFiles: values.processLargeFiles,
      codeInterpreter: values.codeInterpreter,
      addAttachment: values.addAttachment,
      webFetch: values.webFetch,
    }),
    [
      values.addAttachment,
      values.codeInterpreter,
      values.webFetch,
      values.fileTools,
      values.maxInputAttachments,
      values.processLargeFiles,
      values.temperature,
      values.timestamp,
    ],
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
          error={errors.instructions}
          onChange={(value) => setField('instructions', value)}
        />

        <AddOnsSection
          agentSkills={values.agentSkills}
          onAgentSkillsChange={(value) => setField('agentSkills', value)}
          isReadonly={isReadonly}
          tooltip={sharedTooltip}
          addOns={values.addOns}
          onAgentsChange={setAgentIds}
          onConfigureAgent={configureAgent}
          documentRelativeUrl={values.documentRelativeUrl}
          onAddDocuments={addDocuments}
          onRemoveDocument={removeDocument}
          conversationStarters={conversationStarters}
          onConversationStartersSave={handleConversationStartersSave}
        />
      </div>

      <ModelConfigurationSection
        model={values.model}
        onModelChange={(value) => setField('model', value)}
        errors={errors}
        isReadonly={isReadonly}
        tooltip={sharedTooltip}
        isProcessLargeFilesAvailable={isProcessLargeFilesAvailable}
        isCodeInterpreterEnabled={!!settings.isCodeInterpreterEnabled}
        isAddAttachmentEnabled={!!settings.isAddAttachmentEnabled}
        isWebFetchEnabled={!!settings.isWebFetchEnabled}
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
