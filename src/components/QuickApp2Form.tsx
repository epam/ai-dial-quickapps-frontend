'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { Resolver, useForm, useWatch } from 'react-hook-form';

import { DIAL_EDITOR_TRIGGER_SAVE_EVENT } from '@/constants/editor';
import { MarketplaceI18nKeys } from '@/constants/i18n';
import { ToolsetTypes } from '@/constants/quick-apps';
import { useAppContext } from '@/context/AppContext';
import { useDataContext } from '@/context/DataContext';
import {
  AgentOrToolsetSchemaKeys,
  getAgentsAndToolsetsFormValue,
  getQuickApp2FormData,
  getQuickApp2Toolsets,
  MIME_TYPE_REGEX,
  QuickApp2Schema,
  resolveDefaultModelId,
  type QuickApp2Form as QuickApp2FormType,
} from '@/form/quickApp2Form';
import { useTranslation } from '@/hooks/useTranslation';
import { AnyToolset, DialAppTransportType } from '@/types/quick-apps';
import type { QuickApp2Config } from '@/types/quick-apps';
import type { TriggerSaveGeneralPayload } from '@/types/editor-messages';
import type { LocalizedText } from '@/types/dial-entities';
import { Translation } from '@/types/translation';
import { DialAIEntityModel } from '@/utils/application';

import AdvancedSettingsSection from './AdvancedSettings/AdvancedSettingsSection';
import AgentSkillsFormSection from './AgentSkills/AgentSkillsFormSection';
import ContextAndToolsSection from './ContextAndTools/ContextAndToolsSection';
import ConversationStartersSection from './ConversationStarters/ConversationStartersSection';
import OrchestratorSection from './Orchestrator/OrchestratorSection';
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
  const { t, language } = useTranslation(Translation.Marketplace);
  const { app, settings } = useAppContext();
  const { models, modelsMap, toolsetsMap, status } = useDataContext();

  const toolSupportingModelIds = useMemo(
    () => models.filter((m) => m.features?.tools).map((m) => m.id),
    [models],
  );
  const availableModelIds = useMemo(() => models.map((m) => m.id), [models]);

  const sharedTooltip = app.isShared
    ? t(MarketplaceI18nKeys.CannotChangeSharedApp, { context: 'field' })
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
  }, [existingModelId, toolSupportingModelIds, availableModelIds, settings.defaultModelId, getValues, setValue]);

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
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const allEntitiesMap = useMemo(
    () => ({ ...modelsMap, ...toolsetsMap }),
    [modelsMap, toolsetsMap],
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
      void handleSubmit((data) => onSave(data, allEntitiesMap, isAutoSave, general))();
    };

    window.addEventListener(DIAL_EDITOR_TRIGGER_SAVE_EVENT, handleTriggerSave);
    return () => window.removeEventListener(DIAL_EDITOR_TRIGGER_SAVE_EVENT, handleTriggerSave);
  }, [handleSubmit, isDirty, isReadonly, onSave, allEntitiesMap]);

  const isJsonView = watch('isJsonView');
  const starters = watch('starters');
  const agentsAndToolsets = watch('agentsAndToolsets');
  const agentsAndToolsetsJson = watch('agentsAndToolsetsJson');
  const chatMessageInputDisabled = watch('chatMessageInputDisabled');
  const autoSubmit = watch('autoSubmit');

  const hasStarters = starters.some((s) => s.title.trim() && s.text.trim());
  const startersSettingsTooltip =
    sharedTooltip ??
    (!hasStarters ? t(MarketplaceI18nKeys.AtLeastOneStarterIsRequiredToEnableSettings) : undefined);

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

  const handleSwitchToJsonView = useCallback(() => {
    const toolsets = getQuickApp2Toolsets({
      data: getValues(),
      allEntitiesMap,
      language,
    });
    setValue('agentsAndToolsetsJson', JSON.stringify(toolsets, null, 2));
    setValue('isJsonView', true);
  }, [allEntitiesMap, getValues, setValue, language]);

  const handleSwitchToSimpleView = useCallback(
    (toolsets: AnyToolset[]) => {
      setValue(
        'agentsAndToolsets',
        getAgentsAndToolsetsFormValue(toolsets) as QuickApp2FormType['agentsAndToolsets'],
      );
      setValue(
        'codeInterpreter',
        toolsets.some((toolset) => toolset.type === ToolsetTypes.CodeInterpreter),
      );
      setValue('isJsonView', false);
    },
    [setValue],
  );

  const [attachmentTypesResetKey, setAttachmentTypesResetKey] = useState(0);

  const handleAttachmentTypesChange = useCallback(
    (tags: string[], prevTags: string[]) => {
      const addedTags = tags.filter((tag) => !prevTags.includes(tag));
      const hasInvalidTag = addedTags.some((tag) => !MIME_TYPE_REGEX.test(tag));
      if (hasInvalidTag) {
        setError('inputAttachmentTypes', {
          type: 'manual',
          message: t(MarketplaceI18nKeys.PleaseMatchTheMimeFormat),
        });
        // DialTagInput adds tags optimistically to its own state, so force
        // it to remount and resync with the last valid RHF value.
        setAttachmentTypesResetKey((key) => key + 1);
        return;
      }
      clearErrors('inputAttachmentTypes');
      setValue('inputAttachmentTypes', tags, { shouldValidate: true });
    },
    [setError, clearErrors, setValue, t],
  );

  const handleDiscardJson = useCallback(() => {
    const toolsets = getQuickApp2Toolsets({
      data: getValues(),
      allEntitiesMap,
      language,
    });
    setValue('agentsAndToolsetsJson', JSON.stringify(toolsets, null, 2));
    setValue('isJsonView', false);
  }, [allEntitiesMap, getValues, setValue, language]);

  return (
    <form
      onSubmit={handleSubmit((data) => onSave(data, allEntitiesMap, false))}
      className="flex flex-col"
    >
      <OrchestratorSection
        control={control}
        errors={errors}
        isReadonly={isReadonly}
        tooltip={sharedTooltip}
        isProcessLargeFilesAvailable={isProcessLargeFilesAvailable}
      />

      <hr className="border-secondary" />

      <ContextAndToolsSection
        control={control}
        errors={errors}
        isReadonly={isReadonly}
        tooltip={sharedTooltip}
        isCodeInterpreterEnabled={!!settings.isCodeInterpreterEnabled}
        agentsAndToolsets={agentsAndToolsets}
        agentsAndToolsetsJson={agentsAndToolsetsJson}
        isJsonView={isJsonView}
        onAgentsChange={handleAgentsChange}
        onJsonChange={(json: string) => setValue('agentsAndToolsetsJson', json)}
        onSwitchToJsonView={handleSwitchToJsonView}
        onSwitchToSimpleView={handleSwitchToSimpleView}
        onDiscardJson={handleDiscardJson}
        onConfigureAgent={handleConfigureAgent}
      />

      <hr className="border-secondary" />

      <AgentSkillsFormSection control={control} isReadonly={isReadonly} tooltip={sharedTooltip} />

      <hr className="border-secondary" />

      <UserAttachmentsSection
        control={control}
        errors={errors}
        isReadonly={isReadonly}
        tooltip={sharedTooltip}
        attachmentTypesResetKey={attachmentTypesResetKey}
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

      <AdvancedSettingsSection control={control} isReadonly={isReadonly} tooltip={sharedTooltip} />
    </form>
  );
};
