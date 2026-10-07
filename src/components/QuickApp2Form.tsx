import { zodResolver } from '@hookform/resolvers/zod';
import { FC, useCallback, useEffect, useMemo } from 'react';
import { Resolver, useForm, useWatch } from 'react-hook-form';

import { DIAL_EDITOR_TRIGGER_SAVE_EVENT } from '@/constants/editor';
import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useAppContext } from '@/context/AppContext';
import { useDataContext } from '@/context/DataContext';
import {
  AgentOrToolsetSchemaKeys,
  getQuickApp2FormData,
  MIME_TYPE_REGEX,
  QuickApp2Schema,
  resolveDefaultModelId,
  type QuickApp2Form as QuickApp2FormType,
} from '@/form/quickApp2Form';
import { useTranslation } from '@/hooks/useTranslation';
import { DialAppTransportType } from '@/types/quick-apps';
import type { QuickApp2Config } from '@/types/quick-apps';
import type { TriggerSaveGeneralPayload } from '@/types/editor-messages';
import type { LocalizedText } from '@/types/dial-entities';
import { Translation } from '@/types/translation';
import { DialAIEntityModel } from '@/utils/application';

import AdvancedSettingsSection from './AdvancedSettings/AdvancedSettingsSection';
import AddOnsSection from './AddOns/AddOnsSection';
import ContextAndToolsSection from './ContextAndTools/ContextAndToolsSection';
import ConversationStartersSection from './ConversationStarters/ConversationStartersSection';
import InstructionsSection from './InstructionsSection/InstructionsSection';
import ModelConfigurationSection from './Orchestrator/ModelConfigurationSection/ModelConfigurationSection';
import UserAttachmentsSection from './UserAttachments/UserAttachmentsSection';

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
    () => models.filter((m) => m.features?.tools).map((m) => m.id),
    [models],
  );
  const availableModelIds = useMemo(() => models.map((m) => m.id), [models]);

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
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    setError,
    clearErrors,
    formState: { errors, isDirty },
  } = useForm<QuickApp2FormType>({
    defaultValues,
    resolver: zodResolver(QuickApp2Schema) as Resolver<QuickApp2FormType>,
    mode: 'onChange',
  });

  useEffect(() => {
    setValue('toolSupportingModelIds', toolSupportingModelIds);
    setValue('availableModelIds', availableModelIds, { shouldValidate: true });
  }, [toolSupportingModelIds, availableModelIds, setValue]);

  const existingModelId = (app.applicationProperties as QuickApp2Config | undefined)?.orchestrator
    ?.deployment?.deployment_id;

  // The model list loads asynchronously, after the form's initial defaultValues are
  // resolved, so re-resolve the default model once it becomes available.
  useEffect(() => {
    if (getValues('model')) return;
    const resolved = resolveDefaultModelId(
      existingModelId,
      toolSupportingModelIds,
      availableModelIds,
      settings.defaultModelId,
    );
    if (resolved) setValue('model', resolved, { shouldValidate: true });
  }, [
    existingModelId,
    toolSupportingModelIds,
    availableModelIds,
    settings.defaultModelId,
    getValues,
    setValue,
  ]);

  // A model id can be set on the form before its details have loaded (e.g. an
  // existing app's saved model id is applied immediately). Only report ready
  // once the model list has actually loaded and a model value is resolved —
  // i.e. ModelField has either the default or the previously selected model.
  const modelValue = useWatch({ control, name: 'model' });
  useEffect(() => {
    if (status === 'ready' && modelValue) {
      onModelReady?.();
    }
  }, [status, modelValue, onModelReady]);

  const isProcessLargeFilesAvailable = !!modelsMap[modelValue]?.inputAttachmentTypes?.length;

  useEffect(() => {
    if (!settings.isCodeInterpreterEnabled) {
      setValue('codeInterpreter', false);
    }
  }, [settings.isCodeInterpreterEnabled, setValue]);

  useEffect(() => {
    if (!settings.isWebFetchEnabled) {
      setValue('webFetch', false);
    }
  }, [settings.isWebFetchEnabled, setValue]);

  useEffect(() => {
    if (!settings.isAddAttachmentEnabled) {
      setValue('addAttachment', false);
    }
  }, [settings.isAddAttachmentEnabled, setValue]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const allEntitiesMap = useMemo(
    // `mcpAgentsMap` holds applications exposed only via the MCP interface
    // (see DataContext) — they must be included here too, otherwise the
    // entity lookup in getQuickApp2Toolsets fails for them and the dial-app
    // toolset name falls back to "unknown".
    () => ({ ...modelsMap, ...toolsetsMap, ...mcpAgentsMap }),
    [modelsMap, toolsetsMap, mcpAgentsMap],
  );

  useEffect(() => {
    const handleTriggerSave = (event: Event) => {
      const { isAutoSave, ignoreDirty, general } =
        (
          event as CustomEvent<{
            isAutoSave?: boolean;
            ignoreDirty?: boolean;
            general?: TriggerSaveGeneralPayload;
          }>
        ).detail ?? {};
      if (isReadonly) return;
      if (isAutoSave && !ignoreDirty && !isDirty) return;
      void handleSubmit((data) => onSave(data, allEntitiesMap, isAutoSave, general))();
    };

    window.addEventListener(DIAL_EDITOR_TRIGGER_SAVE_EVENT, handleTriggerSave);
    return () => window.removeEventListener(DIAL_EDITOR_TRIGGER_SAVE_EVENT, handleTriggerSave);
  }, [handleSubmit, isDirty, isReadonly, onSave, allEntitiesMap]);

  const starters = watch('starters');
  const agentsAndToolsets = watch('agentsAndToolsets');
  const chatMessageInputDisabled = watch('chatMessageInputDisabled');
  const autoSubmit = watch('autoSubmit');

  const hasStarters = starters.some((s) => s.title.trim() && s.text.trim());
  const startersSettingsTooltip =
    sharedTooltip ??
    (!hasStarters
      ? t(QuickAppEditorI18nKeys.AtLeastOneStarterIsRequiredToEnableSettings)
      : undefined);

  const handleAgentsChange = useCallback(
    (ids: string[]) => {
      const currentMap: Record<string, QuickApp2FormType['agentsAndToolsets'][number]> =
        Object.fromEntries(agentsAndToolsets.map((a) => [a[AgentOrToolsetSchemaKeys.id], a]));
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

  const handleAttachmentTypesChange = useCallback(
    (tags: string[], prevTags: string[]) => {
      const addedTags = tags.filter((tag) => !prevTags.includes(tag));
      const hasInvalidTag = addedTags.some((tag) => !MIME_TYPE_REGEX.test(tag));
      if (hasInvalidTag) {
        setError('inputAttachmentTypes', {
          type: 'manual',
          message: t(QuickAppEditorI18nKeys.PleaseMatchTheMimeFormat),
        });
        // TagInput is controlled by the RHF value, so skipping setValue
        // drops the rejected tag.
        return;
      }
      clearErrors('inputAttachmentTypes');
      setValue('inputAttachmentTypes', tags, { shouldValidate: true });
    },
    [setError, clearErrors, setValue, t],
  );

  return (
    <form
      onSubmit={handleSubmit((data) => onSave(data, allEntitiesMap, false))}
      className="grid grid-cols-1 gap-4 desktop:grid-cols-[minmax(0,1fr)_minmax(280px,440px)] desktop:gap-x-12"
    >
      <div className="min-w-0 flex flex-col min-h-0 gap-4">
        <InstructionsSection control={control} />

        <AddOnsSection
          control={control}
          isReadonly={isReadonly}
          tooltip={sharedTooltip}
          agentsAndToolsets={agentsAndToolsets}
          onAgentsChange={handleAgentsChange}
          onConfigureAgent={handleConfigureAgent}
        />

        <ContextAndToolsSection
          control={control}
          isReadonly={isReadonly}
          tooltip={sharedTooltip}
          isCodeInterpreterEnabled={!!settings.isCodeInterpreterEnabled}
          isWebFetchEnabled={!!settings.isWebFetchEnabled}
          isAddAttachmentEnabled={!!settings.isAddAttachmentEnabled}
        />

        <hr className="border-secondary" />

        <UserAttachmentsSection
          control={control}
          errors={errors}
          isReadonly={isReadonly}
          tooltip={sharedTooltip}
          onAttachmentTypesChange={handleAttachmentTypesChange}
        />

        <hr className="border-secondary" />

        <ConversationStartersSection
          control={control}
          isReadonly={isReadonly}
          hasStarters={hasStarters}
          startersSettingsTooltip={startersSettingsTooltip}
          autoSubmit={autoSubmit}
          chatMessageInputDisabled={chatMessageInputDisabled}
        />

        <hr className="border-secondary" />

        <AdvancedSettingsSection
          control={control}
          isReadonly={isReadonly}
          tooltip={sharedTooltip}
        />
      </div>

      <ModelConfigurationSection
        control={control}
        errors={errors}
        isReadonly={isReadonly}
        tooltip={sharedTooltip}
        isProcessLargeFilesAvailable={isProcessLargeFilesAvailable}
      />
    </form>
  );
};
