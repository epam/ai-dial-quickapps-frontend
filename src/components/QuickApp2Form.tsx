'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { Resolver, useForm } from 'react-hook-form';

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
  type QuickApp2Form as QuickApp2FormType,
} from '@/form/quickApp2Form';
import { useTranslation } from '@/hooks/useTranslation';
import { AnyToolset, DialAppTransportType } from '@/types/quick-apps';
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
  DialAIEntityModel & { id: string; name?: string; type?: string }
>;

interface QuickApp2FormProps {
  onSave: (
    data: QuickApp2FormType,
    allEntitiesMap: QuickApp2AllEntitiesMap,
    isAutoSave?: boolean,
  ) => void;
  onDirtyChange?: (isDirty: boolean) => void;
  readonly?: boolean;
}

export const QuickApp2Form: FC<QuickApp2FormProps> = ({ onSave, onDirtyChange, readonly }) => {
  const { t } = useTranslation(Translation.Marketplace);
  const { app, settings } = useAppContext();
  const { models, modelsMap, toolsetsMap } = useDataContext();

  const toolSupportingModelIds = useMemo(
    () => models.filter((m) => m.features?.tools).map((m) => m.id),
    [models],
  );
  const availableModelIds = useMemo(() => models.map((m) => m.id), [models]);

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
      const { isAutoSave, ignoreDirty } =
        (event as CustomEvent<{ isAutoSave?: boolean; ignoreDirty?: boolean }>).detail ?? {};
      if (isReadonly) return;
      if (isAutoSave && !ignoreDirty && !isDirty) return;
      void handleSubmit((data) => onSave(data, allEntitiesMap, isAutoSave))();
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
    });
    setValue('agentsAndToolsetsJson', JSON.stringify(toolsets, null, 2));
    setValue('isJsonView', true);
  }, [allEntitiesMap, getValues, setValue]);

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
    });
    setValue('agentsAndToolsetsJson', JSON.stringify(toolsets, null, 2));
    setValue('isJsonView', false);
  }, [allEntitiesMap, getValues, setValue]);

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
