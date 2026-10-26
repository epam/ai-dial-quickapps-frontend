import omit from 'lodash-es/omit';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DIAL_EDITOR_TRIGGER_SAVE_EVENT } from '@/constants/editor';
import type { ApplicationEditorI18nKeys } from '@/constants/translation-keys';
import { DEFAULT_MAX_INPUT_ATTACHMENTS } from '@/constants/quick-apps';
import { useAppContext } from '@/context/AppContext';
import { useDataContext } from '@/context/DataContext';
import { getQuickApp2FormData } from '@/form/quickApp2Form';
import { useQuickApp2Form } from '@/hooks/use-quick-app2-form';
import {
  areSameEditJsonDocuments,
  buildEditJsonDocument,
  reuseStarterIds,
  type EditJsonContext,
} from '@/utils/edit-json';
import type { TriggerSaveEventDetail, TriggerSaveGeneralPayload } from '@/types/editor-messages';
import type { QuickApp2Form as QuickApp2FormType } from '@/form/quickApp2Form';
import type { QuickApp2Config } from '@/types/quick-apps';
import type { AdvancedSettingsValues } from '@/types/advanced-settings';
import type { ConversationStartersValues } from '@/types/conversation-starters';
import type { DialAIEntityModel, LocalizedText } from '@/types/dial-entities';
import { useTranslation } from 'react-i18next';

import AddOnsSection from '../AddOns/AddOnsSection/AddOnsSection';
import EditJsonPopup from '../EditJson/EditJsonPopup/EditJsonPopup';
import InstructionsSection from '../InstructionsSection/InstructionsSection';
import ModelConfigurationSection from '../Orchestrator/ModelConfigurationSection/ModelConfigurationSection';

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
  ) => Promise<boolean>;
  onDirtyChange?: (isDirty: boolean) => void;
  /** Called with whether the form values currently pass validation (deferred errors included). */
  onValidityChange?: (isValid: boolean) => void;
  /** Called when a manual save is blocked by form validation, with the error messages. */
  onValidationError?: (messages: string[]) => void;
  /** Called once a model is resolved for the form — either the app's saved model or the default. */
  onModelReady?: () => void;
}

export const QuickApp2Form: FC<QuickApp2FormProps> = ({
  onSave,
  onDirtyChange,
  onValidationError,
  onValidityChange,
  onModelReady,
}) => {
  const { t, i18n } = useTranslation();
  const { app, settings } = useAppContext();
  const { models, modelsMap, toolsetsMap, mcpAgentsMap, status } = useDataContext();

  const toolSupportingModelIds = useMemo(
    () => models.filter((model) => model.features?.tools).map((model) => model.id),
    [models],
  );
  const availableModelIds = useMemo(() => models.map((model) => model.id), [models]);
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
    isValid,
    isModelReady,
    setField,
    setValues,
    syncExternalState,
    submit,
    markSaved,
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

  useEffect(() => {
    onValidityChange?.(isValid);
  }, [isValid, onValidityChange]);

  const allEntitiesMap = useMemo(
    // MCP agents are separate from the model map but are valid toolset entities.
    () => ({ ...modelsMap, ...toolsetsMap, ...mcpAgentsMap }),
    [mcpAgentsMap, modelsMap, toolsetsMap],
  );

  const isProcessLargeFilesAvailable = !!modelsMap[values.model]?.inputAttachmentTypes?.length;

  // True while `maxInputAttachments` holds a default that only the Attachments toggle put there.
  const isMaxAttachmentsSeededRef = useRef(false);

  const handleSubmitForm = useCallback(
    (isAutoSave = false, general?: TriggerSaveGeneralPayload) => {
      const result = submit();
      if (!result.isValid) {
        if (!isAutoSave) {
          const messages = Object.values(result.errors).filter((message) => message != null);
          onValidationError?.(messages.map((message) => t(message as ApplicationEditorI18nKeys)));
        }
        return;
      }
      // A saved max is the baseline now and must survive a later turn-off.
      isMaxAttachmentsSeededRef.current = false;
      // The values as submitted, not the later ones: edits made while the save
      // is in flight must stay dirty.
      const submittedValues = values;
      const save = async () => {
        const isSaved = await onSave(result.data, allEntitiesMap, isAutoSave, general);
        if (isSaved) markSaved(submittedValues);
      };
      void save();
    },
    [allEntitiesMap, markSaved, onSave, onValidationError, submit, t, values],
  );

  useEffect(() => {
    const handleTriggerSave = (event: Event) => {
      const { isAutoSave, shouldIgnoreDirty, general } =
        (event as CustomEvent<TriggerSaveEventDetail>).detail ?? {};
      if (isAutoSave && !shouldIgnoreDirty && !isDirty) return;
      handleSubmitForm(!!isAutoSave, general);
    };

    window.addEventListener(DIAL_EDITOR_TRIGGER_SAVE_EVENT, handleTriggerSave);
    return () => window.removeEventListener(DIAL_EDITOR_TRIGGER_SAVE_EVENT, handleTriggerSave);
  }, [handleSubmitForm, isDirty]);

  const advancedSettings = useMemo<AdvancedSettingsValues>(
    () => ({
      temperature: values.temperature,
      maxInputAttachments: values.maxInputAttachments,
      timestamp: values.timestamp,
      fileTools: values.fileTools,
      processLargeFiles: values.processLargeFiles,
      addAttachment: values.addAttachment,
      webFetch: values.webFetch,
    }),
    [
      values.addAttachment,
      values.webFetch,
      values.fileTools,
      values.maxInputAttachments,
      values.processLargeFiles,
      values.temperature,
      values.timestamp,
    ],
  );
  const handleAdvancedSettingsSave = useCallback(
    (nextAdvancedSettings: AdvancedSettingsValues) => {
      // A max confirmed in the popup is the user's, even when it equals the default.
      isMaxAttachmentsSeededRef.current = false;
      setValues(nextAdvancedSettings);
    },
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
      const { maxInputAttachments } = values;
      if (isEnabled) {
        if (maxInputAttachments == null || maxInputAttachments === '') {
          isMaxAttachmentsSeededRef.current = true;
          setValues({
            attachmentsEnabled: true,
            maxInputAttachments: DEFAULT_MAX_INPUT_ATTACHMENTS,
          });
          return;
        }
        setField('attachmentsEnabled', true);
        return;
      }
      // The max is kept on turn-off so turning Attachments back on restores it; only a value
      // the toggle itself seeded is dropped, so on → off leaves the form untouched.
      const shouldDropSeededMax =
        isMaxAttachmentsSeededRef.current && maxInputAttachments === DEFAULT_MAX_INPUT_ATTACHMENTS;
      isMaxAttachmentsSeededRef.current = false;
      setValues({
        attachmentsEnabled: false,
        inputAttachmentTypes: [],
        ...(shouldDropSeededMax ? { maxInputAttachments: undefined } : {}),
      });
    },
    [setField, setValues, values],
  );
  const handleCodeInterpreterChange = useCallback(
    (isEnabled: boolean) => setField('codeInterpreter', isEnabled),
    [setField],
  );
  const handleInputAttachmentTypesChange = useCallback(
    (mimeTypes: string[]) => setField('inputAttachmentTypes', mimeTypes),
    [setField],
  );

  const [editJsonDocument, setEditJsonDocument] = useState<string | null>(null);
  const language = i18n.resolvedLanguage ?? i18n.language;
  const editJsonContext = useMemo<EditJsonContext>(
    () => ({
      allEntitiesMap,
      language,
      toolSupportingModelIds,
      availableModelIds,
      defaultModelId: settings.defaultModelId,
    }),
    [allEntitiesMap, availableModelIds, language, settings.defaultModelId, toolSupportingModelIds],
  );
  const handleEditJsonOpen = useCallback(
    () => setEditJsonDocument(buildEditJsonDocument(values, editJsonContext)),
    [editJsonContext, values],
  );
  const handleEditJsonClose = useCallback(() => setEditJsonDocument(null), []);
  const handleEditJsonSave = useCallback(
    (next: QuickApp2FormType) => {
      // A document that reads back as the current configuration changes nothing, so saving it
      // unchanged does not make the form dirty (the extra config is stored in a normalised
      // shape that can differ from the loaded one without differing in what is saved).
      if (areSameEditJsonDocuments(next, values, editJsonContext)) return;
      // The model lists belong to the loaded data, not to the document.
      const nextValues = omit(next, ['toolSupportingModelIds', 'availableModelIds']);
      // The JSON cannot switch on a feature the host setting keeps off (as on load).
      isMaxAttachmentsSeededRef.current = false;
      setValues(
        {
          ...nextValues,
          starters: reuseStarterIds(nextValues.starters, values.starters),
          codeInterpreter: nextValues.codeInterpreter && !!settings.isCodeInterpreterEnabled,
          webFetch: nextValues.webFetch && !!settings.isWebFetchEnabled,
          addAttachment: nextValues.addAttachment && !!settings.isAddAttachmentEnabled,
        },
        { shouldValidate: true },
      );
    },
    [
      editJsonContext,
      setValues,
      settings.isAddAttachmentEnabled,
      settings.isCodeInterpreterEnabled,
      settings.isWebFetchEnabled,
      values,
    ],
  );

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmitForm();
      }}
      // From the desktop layout the form is exactly as tall as the view: only the primary column
      // scrolls, so its scrollbar sits between the two columns and Configuration never moves.
      className="grid grid-cols-1 gap-4 desktop:h-dvh desktop:grid-cols-[minmax(0,1fr)_minmax(280px,440px)] desktop:grid-rows-[minmax(0,1fr)] desktop:gap-x-0"
    >
      {/* `relative` keeps the UI kit's visually hidden inputs inside this scroller (Issue #260).
          The padding keeps the cards off the scrollbar and gives their shadows room, which the
          scroller would otherwise clip into a band between the cards; the negative start margin
          keeps the cards where they were. */}
      <div className="relative min-w-0 flex flex-col min-h-0 gap-4 desktop:-ms-4 desktop:overflow-y-auto desktop:ps-4 desktop:pe-4">
        <InstructionsSection
          value={values.instructions}
          error={errors.instructions}
          onChange={(value) => setField('instructions', value)}
        />

        <AddOnsSection
          agentSkills={values.agentSkills}
          onAgentSkillsChange={(value) => setField('agentSkills', value)}
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
        isProcessLargeFilesAvailable={isProcessLargeFilesAvailable}
        isCodeInterpreterEnabled={!!settings.isCodeInterpreterEnabled}
        isCodeInterpreterOn={values.codeInterpreter}
        onCodeInterpreterChange={handleCodeInterpreterChange}
        isAddAttachmentEnabled={!!settings.isAddAttachmentEnabled}
        isWebFetchEnabled={!!settings.isWebFetchEnabled}
        advancedSettings={advancedSettings}
        onAdvancedSettingsSave={handleAdvancedSettingsSave}
        isAttachmentsEnabled={values.attachmentsEnabled}
        onAttachmentsEnabledChange={handleAttachmentsEnabledChange}
        inputAttachmentTypes={values.inputAttachmentTypes}
        onInputAttachmentTypesChange={handleInputAttachmentTypesChange}
        onEditJsonClick={handleEditJsonOpen}
      />

      {editJsonDocument != null && (
        // Mounted only while open so every open re-seeds the popup draft from the form.
        <EditJsonPopup
          document={editJsonDocument}
          context={editJsonContext}
          onSave={handleEditJsonSave}
          onClose={handleEditJsonClose}
        />
      )}
    </form>
  );
};
