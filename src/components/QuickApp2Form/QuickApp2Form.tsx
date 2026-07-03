"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";

import { MarketplaceI18nKeys } from "@/constants/i18n";
import { ToolsetTypes } from "@/constants/quick-apps";
import { useAppContext } from "@/context/AppContext";
import { useDataContext } from "@/context/DataContext";
import {
  AgentOrToolsetSchemaKeys,
  getAgentsAndToolsetsFormValue,
  getQuickApp2FormData,
  getQuickApp2Toolsets,
  MIME_TYPE_REGEX,
  QuickApp2Schema,
  type QuickApp2Form as QuickApp2FormType,
} from "@/form/quickApp2Form";
import { useTranslation } from "@/hooks/useTranslation";
import { AnyToolset, DialAppTransportType } from "@/types/quick-apps";
import { Translation } from "@/types/translation";

import { FilesSelector } from "@/components/common/FilesSelector/FilesSelector";
import { FormCollapsibleSection } from "@/components/common/FormCollapsibleSection";
import { Field } from "@/components/common/Forms/Field";
import { DialMarkdownEditorContainer } from "@/components/common/MarkdownEditor/MarkdownEditorContainer";
import { TemperatureSlider } from "@/components/common/Temperature";

import { ToggleSwitch } from "@/components/common/ToggleSwitch/ToggleSwitch";

import { AgentsAndToolsetsField } from "./AgentsAndToolsetsField";
import { AgentSkillsField } from "./AgentSkillsField";
import { CodeInterpreterField } from "./CodeInterpreterField";
import { ConversationStartersList } from "./ConversationStartersField";
import { ModelField } from "./ModelField";
import { StartersBehaviourRadioGroup } from "./StartersBehaviourRadioGroup";

import {
  ButtonVariant,
  DialButton,
  DialFormItem,
  DialInput,
  DialTagInput,
} from "@epam/ai-dial-ui-kit";

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

  const toolSupportingModelIds = useMemo(
    () => models.filter((m) => m.features?.tools).map((m) => m.id),
    [models],
  );
  const availableModelIds = useMemo(() => models.map((m) => m.id), [models]);

  const sharedTooltip = app.isShared
    ? t(MarketplaceI18nKeys.CannotChangeSharedApp, { context: "field" })
    : undefined;

  const isReadonly = readonly || !!app.isShared;

  const defaultValues = getQuickApp2FormData(
    app,
    toolSupportingModelIds,
    availableModelIds,
  );

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<QuickApp2FormType>({
    defaultValues,
    resolver: zodResolver(QuickApp2Schema),
    mode: "onChange",
  });

  useEffect(() => {
    setValue("toolSupportingModelIds", toolSupportingModelIds);
    setValue("availableModelIds", availableModelIds, { shouldValidate: true });
  }, [toolSupportingModelIds, availableModelIds, setValue]);

  const allEntitiesMap = useMemo(
    () => ({ ...modelsMap, ...toolsetsMap }),
    [modelsMap, toolsetsMap],
  );

  const isJsonView = watch("isJsonView");
  const starters = watch("starters");
  const agentsAndToolsets = watch("agentsAndToolsets");
  const agentsAndToolsetsJson = watch("agentsAndToolsetsJson");
  const model = watch("model");
  const codeInterpreter = watch("codeInterpreter");
  const agentSkills = watch("agentSkills");
  const chatMessageInputDisabled = watch("chatMessageInputDisabled");
  const autoSubmit = watch("autoSubmit");

  const hasStarters = starters.some((s) => s.title.trim() && s.text.trim());
  const startersSettingsTooltip =
    sharedTooltip ??
    (!hasStarters
      ? t(MarketplaceI18nKeys.AtLeastOneStarterIsRequiredToEnableSettings)
      : undefined);

  const handleAgentsChange = useCallback(
    (ids: string[]) => {
      const currentMap: Record<
        string,
        QuickApp2FormType["agentsAndToolsets"][number]
      > = Object.fromEntries(
        agentsAndToolsets.map((a) => [a[AgentOrToolsetSchemaKeys.id], a]),
      );
      const next = ids.map((id) => {
        if (currentMap[id]) return currentMap[id];
        return { [AgentOrToolsetSchemaKeys.id]: id };
      });
      setValue(
        "agentsAndToolsets",
        next as QuickApp2FormType["agentsAndToolsets"],
      );
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
      setValue(
        "agentsAndToolsets",
        next as QuickApp2FormType["agentsAndToolsets"],
      );
    },
    [agentsAndToolsets, setValue],
  );

  const handleSwitchToJsonView = useCallback(() => {
    const toolsets = getQuickApp2Toolsets({
      data: getValues(),
      allEntitiesMap,
    });
    setValue("agentsAndToolsetsJson", JSON.stringify(toolsets, null, 2));
    setValue("isJsonView", true);
  }, [allEntitiesMap, getValues, setValue]);

  const handleSwitchToSimpleView = useCallback(
    (toolsets: AnyToolset[]) => {
      setValue(
        "agentsAndToolsets",
        getAgentsAndToolsetsFormValue(
          toolsets,
        ) as QuickApp2FormType["agentsAndToolsets"],
      );
      setValue(
        "codeInterpreter",
        toolsets.some(
          (toolset) => toolset.type === ToolsetTypes.CodeInterpreter,
        ),
      );
      setValue("isJsonView", false);
    },
    [setValue],
  );

  const [attachmentTypesResetKey, setAttachmentTypesResetKey] = useState(0);

  const handleAttachmentTypesChange = useCallback(
    (tags: string[], prevTags: string[]) => {
      const addedTags = tags.filter((tag) => !prevTags.includes(tag));
      const hasInvalidTag = addedTags.some(
        (tag) => !MIME_TYPE_REGEX.test(tag),
      );
      if (hasInvalidTag) {
        setError("inputAttachmentTypes", {
          type: "manual",
          message: t(MarketplaceI18nKeys.PleaseMatchTheMimeFormat),
        });
        // DialTagInput adds tags optimistically to its own state, so force
        // it to remount and resync with the last valid RHF value.
        setAttachmentTypesResetKey((key) => key + 1);
        return;
      }
      clearErrors("inputAttachmentTypes");
      setValue("inputAttachmentTypes", tags, { shouldValidate: true });
    },
    [setError, clearErrors, setValue, t],
  );

  const handleDiscardJson = useCallback(() => {
    const toolsets = getQuickApp2Toolsets({
      data: getValues(),
      allEntitiesMap,
    });
    setValue("agentsAndToolsetsJson", JSON.stringify(toolsets, null, 2));
    setValue("isJsonView", false);
  }, [allEntitiesMap, getValues, setValue]);

  return (
    <form
      onSubmit={handleSubmit(onSave as SubmitHandler<QuickApp2FormType>)}
      className="flex flex-col"
    >
      {/* Orchestrator section */}
      <FormCollapsibleSection
        name={t(MarketplaceI18nKeys.Orchestrator)}
        description={t(MarketplaceI18nKeys.OrchestratorDescription)}
        openByDefault
        dataQa="orchestrator-section"
      >
        {/* Model */}
        <DialFormItem label={t(MarketplaceI18nKeys.ModelMarketplace)}>
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
        </DialFormItem>

        {/* Temperature */}
        <DialFormItem label={t(MarketplaceI18nKeys.TemperatureMarketplace)}>
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
        </DialFormItem>

        {/* Instructions */}
        <DialFormItem label={t(MarketplaceI18nKeys.InstructionsMarketplace)}>
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
        </DialFormItem>
      </FormCollapsibleSection>

      <hr className="border-secondary" />

      {/* Context & Tools section */}
      <FormCollapsibleSection
        name={t(MarketplaceI18nKeys.ContextAndTools)}
        description={t(MarketplaceI18nKeys.ContextAndToolsDescription)}
        openByDefault
        dataQa="context-and-tools-section"
      >
        {/* Agents & Toolsets */}
        <DialFormItem label={t(MarketplaceI18nKeys.AgentsAndToolsets)}>
          <AgentsAndToolsetsField
            agentsAndToolsets={agentsAndToolsets}
            agentsAndToolsetsJson={agentsAndToolsetsJson}
            isJsonView={isJsonView}
            onAgentsChange={handleAgentsChange}
            onJsonChange={(json) => setValue("agentsAndToolsetsJson", json)}
            onSwitchToJsonView={handleSwitchToJsonView}
            onSwitchToSimpleView={handleSwitchToSimpleView}
            onDiscardJson={handleDiscardJson}
            onConfigureAgent={handleConfigureAgent}
            readonly={isReadonly}
            tooltip={sharedTooltip}
            jsonError={errors.agentsAndToolsetsJson?.message}
          />
        </DialFormItem>

        {/* Context files */}
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
                tooltip={sharedTooltip}
                onRemoveFile={(doc) =>
                  field.onChange(field.value.filter((f) => f !== doc))
                }
                onAddFiles={(docs) => field.onChange(docs)}
              />
            )}
          />
        </DialFormItem>

        {/* Code Interpreter */}
        {settings.isCodeInterpreterEnabled && (
          <DialFormItem
            label={t(MarketplaceI18nKeys.CodeInterpreter)}
            description={t(MarketplaceI18nKeys.CodeInterpreterInfo)}
            className="mb-4"
          >
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
          </DialFormItem>
        )}
      </FormCollapsibleSection>

      <hr className="border-secondary" />

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

      <hr className="border-secondary" />

      {/* User Attachments section */}
      <FormCollapsibleSection
        name={t(MarketplaceI18nKeys.UserAttachments)}
        description={t(MarketplaceI18nKeys.UserAttachmentsDescription)}
        dataQa="user-attachments-section"
      >
        {/* Attachment types */}
        <DialFormItem
          label={t(MarketplaceI18nKeys.AttachmentTypes)}
          description={t(MarketplaceI18nKeys.InputMIMEType)}
        >
          <Controller
            control={control}
            name="inputAttachmentTypes"
            render={({ field }) => (
              <DialTagInput
                key={attachmentTypesResetKey}
                initialTags={field.value}
                onChange={(tags) =>
                  handleAttachmentTypesChange(tags, field.value)
                }
                disabled={isReadonly}
                placeholder={t(MarketplaceI18nKeys.EnterAttachmentTypes)}
                invalid={!!errors.inputAttachmentTypes}
                errorText={errors.inputAttachmentTypes?.message}
              />
            )}
          />
        </DialFormItem>

        {/* Max attachments */}
        <DialFormItem label={t(MarketplaceI18nKeys.MaxAttachmentsNumber)}>
          <Controller
            control={control}
            name="maxInputAttachments"
            render={({ field }) => (
              <Field
                value={field.value?.toString() ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  field.onChange(val ? Number(val) : undefined);
                }}
                type="number"
                min={1}
                disabled={isReadonly}
                title={sharedTooltip}
                placeholder={t(MarketplaceI18nKeys.EnterMaxAttachments)}
                error={
                  errors.maxInputAttachments?.message as string | undefined
                }
              />
            )}
          />
        </DialFormItem>
      </FormCollapsibleSection>

      <hr className="border-secondary" />

      {/* Conversation Starters section */}
      <FormCollapsibleSection
        name={t(MarketplaceI18nKeys.ConversationStarters)}
        description={t(MarketplaceI18nKeys.StartersDescription)}
        dataQa="conversation-starters-section"
      >
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

        {/* Starters settings — always visible; controls disabled until a valid starter exists */}
        <div className="mt-1 flex flex-col gap-3">
          <div>
            <h3 className="text-sm font-semibold">
              {t(MarketplaceI18nKeys.StartersSettings)}
            </h3>
            <p className="mt-1 text-sm text-secondary">
              {t(
                MarketplaceI18nKeys.AtLeastOneStarterIsRequiredToEnableSettings,
              )}
            </p>
          </div>

          {/* Intro text */}
          <Controller
            control={control}
            name="introText"
            render={({ field }) => (
              <DialInput
                labelProps={{
                  label: t(MarketplaceI18nKeys.IntroText),
                  caption: t(
                    MarketplaceI18nKeys.OptionalTextShownAboveTheStarters,
                  ),
                }}
                value={field.value ?? ""}
                onChange={(val) => field.onChange(val ?? "")}
                disabled={isReadonly || !hasStarters}
                placeholder={t(MarketplaceI18nKeys.EnterIntroText)}
                containerClassName="w-full"
                tooltipText={startersSettingsTooltip}
              />
            )}
          />

          {/* Starters behavior */}
          <DialFormItem label={t(MarketplaceI18nKeys.StartersBehavior)}>
            <Controller
              control={control}
              name="autoSubmit"
              render={({ field }) => (
                <StartersBehaviourRadioGroup
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isReadonly || !hasStarters}
                  tooltip={startersSettingsTooltip}
                />
              )}
            />
          </DialFormItem>

          {/* Disable chat input */}
          <Controller
            control={control}
            name="chatMessageInputDisabled"
            render={({ field }) => (
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">
                  {t(MarketplaceI18nKeys.DisableChatInput)}
                </p>
                <ToggleSwitch
                  isOn={field.value}
                  handleSwitch={() => field.onChange(!field.value)}
                  disabled={isReadonly || !hasStarters}
                  additionalText={t(
                    MarketplaceI18nKeys.DisableChatInputSoUsersCanOnlyUseStarters,
                  )}
                  tooltip={startersSettingsTooltip}
                  warning={
                    !autoSubmit && chatMessageInputDisabled
                      ? t(
                          MarketplaceI18nKeys.PayAttentionTheUserWontBeAbleToEdit,
                        )
                      : undefined
                  }
                />
              </div>
            )}
          />
        </div>
      </FormCollapsibleSection>

      <hr className="border-secondary" />

      {/* Advanced settings */}
      <FormCollapsibleSection
        name={t(MarketplaceI18nKeys.AdvancedSettings)}
        dataQa="advanced-settings-section"
      >
        {/* Time awareness */}
        <Controller
          control={control}
          name="timestamp"
          render={({ field }) => (
            <ToggleSwitch
              isOn={field.value}
              handleSwitch={() => field.onChange(!field.value)}
              disabled={isReadonly}
              additionalText={t(MarketplaceI18nKeys.TimeAwareness)}
              className="flex items-center gap-2"
              tooltip={sharedTooltip}
            />
          )}
        />
      </FormCollapsibleSection>
    </form>
  );
};
