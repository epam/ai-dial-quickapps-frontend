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
import type { LocalizedText } from '@/types/dial-entities';
import { Translation } from '@/types/translation';
import { useTranslation } from '@/hooks/useTranslation';
import { DialAIEntityModel } from '@/utils/application';

import AdvancedSettingsSection from './AdvancedSettings/AdvancedSettingsSection';
import AgentSkillsFormSection from './AgentSkills/AgentSkillsFormSection';
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
  const { t, language } = useTranslation(Translation.QuickAppEditor);
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
    attachmentTypesResetKey,
    setField,
    setValues,
    syncExternalState,
    submit,
    setAgentIds,
    configureAgent,
    switchToJsonView,
    switchToSimpleView,
    discardJson,
    setAttachmentTypes,
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
  const hasStarters = values.starters.some((starter) => starter.title.trim() && starter.text.trim());
  const startersSettingsTooltip =
    sharedTooltip ??
    (!hasStarters ? t(QuickAppEditorI18nKeys.AtLeastOneStarterIsRequiredToEnableSettings) : undefined);

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
  const handleSwitchToJsonView = useCallback(
    () => switchToJsonView(allEntitiesMap, language),
    [allEntitiesMap, language, switchToJsonView],
  );
  const handleDiscardJson = useCallback(
    () => discardJson(allEntitiesMap, language),
    [allEntitiesMap, discardJson, language],
  );
  const handleAttachmentTypesChange = useCallback(
    (tags: string[], previousTags: string[]) =>
      setAttachmentTypes(
        tags,
        previousTags,
        t(QuickAppEditorI18nKeys.PleaseMatchTheMimeFormat),
      ),
    [setAttachmentTypes, t],
  );

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmitForm();
      }}
      className="grid grid-cols-1 gap-4 p-4 desktop:grid-cols-[minmax(0,1fr)_minmax(280px,440px)] desktop:gap-x-12 desktop:px-8 desktop:py-7"
    >
      <div className="min-w-0">
        <InstructionsSection
          value={values.instructions}
          onChange={(value) => setField('instructions', value)}
        />

        <hr className="border-secondary" />

        <QuickApp2FormLegacyFields
          values={values}
          errors={errors}
          isReadonly={isReadonly}
          tooltip={sharedTooltip}
          isCodeInterpreterEnabled={!!settings.isCodeInterpreterEnabled}
          isWebFetchEnabled={!!settings.isWebFetchEnabled}
          isAddAttachmentEnabled={!!settings.isAddAttachmentEnabled}
          attachmentTypesResetKey={attachmentTypesResetKey}
          agentSkills={
            <AgentSkillsFormSection
              value={values.agentSkills}
              onChange={(value) => setField('agentSkills', value)}
              isReadonly={isReadonly}
              tooltip={sharedTooltip}
            />
          }
          startersSettingsTooltip={startersSettingsTooltip}
          onValuesChange={handleLegacyValuesChange}
          onAttachmentTypesChange={handleAttachmentTypesChange}
          onAgentsChange={setAgentIds}
          onJsonChange={(json) => setField('agentsAndToolsetsJson', json)}
          onSwitchToJsonView={handleSwitchToJsonView}
          onSwitchToSimpleView={switchToSimpleView}
          onDiscardJson={handleDiscardJson}
          onConfigureAgent={configureAgent}
        />

        <hr className="border-secondary" />

        <AdvancedSettingsSection
          value={values.timestamp}
          onChange={(value) => setField('timestamp', value)}
          isReadonly={isReadonly}
          tooltip={sharedTooltip}
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
      />
    </form>
  );
};
