import { DEFAULT_TEMPERATURE, DEFAULT_MAX_INPUT_ATTACHMENTS } from '@/constants/quick-apps';
import { getQuickAppItemNameFromConfig, migrateMCPToolsetIdName } from '@/utils/application';
import { decodeApiUrl } from '@/utils/api';
import type { ApplicationSchemaDefaults } from '@/types/dial-entities';
import { getQuickApp2ExtraConfig, isOwnedContext } from '@/utils/quick-app-extra-config';
import {
  AnyToolset,
  DialDeploymentSimpleTool,
  DialSkillRef,
  MCPToolset,
  QuickApp2Config,
  SkillRefType,
  ToolsetTypes,
} from '@/types/quick-apps';
import {
  isDialAppToolset,
  isDialDeploymentSimpleTool,
  isDialDeploymentToolset,
  isMcpToolset,
  isUnknownToolset,
} from '@/utils/toolset-guards';
import isEmpty from 'lodash-es/isEmpty';
import sortBy from 'lodash-es/sortBy';
import { nanoid } from 'nanoid';
import { AddOnSchemaKeys, type AddOnEntry, type QuickApp2Form } from '@/types/quick-app-form';
import { normalizeMaxInputAttachments } from '@/form/quick-app-form-schema';

export const getAddOnsFormValue = (tools?: AnyToolset[]): AddOnEntry[] => {
  const deploymentTools = tools?.filter(isDialDeploymentToolset)?.flatMap((t) => t.tools) ?? [];
  const mcpToolsets = (tools?.filter(isMcpToolset) ?? []).map(migrateMCPToolsetIdName);
  const dialAppToolsets = tools?.filter(isDialAppToolset) ?? [];
  const unknownToolsets = tools?.filter(isUnknownToolset) ?? [];

  const markedDeploymentTools = deploymentTools.map((item) => ({
    ...item,
    [AddOnSchemaKeys.name]: getQuickAppItemNameFromConfig(item),
    [AddOnSchemaKeys.isDialDeploymentTool]: true,
  }));
  const allItems = [...mcpToolsets, ...unknownToolsets, ...dialAppToolsets].map((item) => ({
    ...item,
    [AddOnSchemaKeys.name]: getQuickAppItemNameFromConfig(item as MCPToolset),
  }));

  const sortedItems = sortBy(
    [...markedDeploymentTools, ...allItems],
    [(item) => item[AddOnSchemaKeys.name].toLowerCase()],
  );

  return sortedItems.map((item) => {
    const id =
      isUnknownToolset(item) && !isDialDeploymentSimpleTool(item)
        ? undefined
        : (item as DialDeploymentSimpleTool).deployment_id;
    return {
      [AddOnSchemaKeys.id]: id ? decodeApiUrl(id) : (item[AddOnSchemaKeys.name] ?? 'unknown'),
      [AddOnSchemaKeys.tool]: item,
      [AddOnSchemaKeys.isDialDeploymentTool]:
        AddOnSchemaKeys.isDialDeploymentTool in item
          ? (item[AddOnSchemaKeys.isDialDeploymentTool] as boolean)
          : false,
    };
  });
};

export const resolveDefaultModelId = (
  existingModelId?: string,
  toolSupportingModelIds?: string[],
  availableModelIds?: string[],
  defaultModelId?: string,
  schemaDefaultModelId?: string,
): string => {
  if (existingModelId) return existingModelId;
  // An unusable schema default is skipped, not reported: the user cannot fix a backend default.
  if (
    schemaDefaultModelId &&
    availableModelIds?.includes(schemaDefaultModelId) &&
    toolSupportingModelIds?.includes(schemaDefaultModelId)
  ) {
    return schemaDefaultModelId;
  }
  if (defaultModelId && availableModelIds?.includes(defaultModelId)) return defaultModelId;
  return toolSupportingModelIds?.[0] ?? '';
};

export const getQuickApp2FormData = (
  app?: {
    applicationProperties?: unknown;
    inputAttachmentTypes?: unknown;
    maxInputAttachments?: unknown;
  },
  toolSupportingModelIds?: string[],
  availableModelIds?: string[],
  defaultModelId?: string,
  schemaDefaults?: ApplicationSchemaDefaults,
): QuickApp2Form => {
  const appProperties = app?.applicationProperties as QuickApp2Config | undefined;
  const inputAttachmentTypes = (app?.inputAttachmentTypes as string[] | undefined) ?? [];
  const model = resolveDefaultModelId(
    appProperties?.orchestrator?.deployment?.deployment_id,
    toolSupportingModelIds,
    availableModelIds,
    defaultModelId,
    schemaDefaults?.deploymentId,
  );
  // Schema defaults fill what the app has not stored. A stored `conversation_starters` object
  // without `intro_text` means the intro was left empty, so it is read as stored.
  const starterDefaults = appProperties?.conversation_starters
    ? undefined
    : schemaDefaults?.conversationStarters;
  const timestamp =
    'timestamp' in (appProperties?.features ?? {}) ? !!appProperties?.features?.timestamp : true;
  const processLargeFiles =
    'attachment_strategy' in (appProperties?.orchestrator ?? {})
      ? !!appProperties?.orchestrator?.attachment_strategy
      : true;
  const fileTools =
    'dial_files' in (appProperties?.features ?? {}) ? !!appProperties?.features?.dial_files : true;
  const addAttachment =
    'representation_tooling' in (appProperties?.features ?? {})
      ? !!appProperties?.features?.representation_tooling?.add_attachment
      : (schemaDefaults?.addAttachment ?? true);
  const webFetch =
    'web_fetch' in (appProperties?.features ?? {})
      ? !!appProperties?.features?.web_fetch?.enabled
      : (schemaDefaults?.webFetch ?? true);

  return {
    documentRelativeUrl: (appProperties?.contexts ?? []).filter(isOwnedContext).map((c) => c.url),
    model,
    instructions: appProperties?.orchestrator?.system_prompt?.content ?? '',
    temperature:
      appProperties?.orchestrator?.deployment?.parameters?.temperature ??
      schemaDefaults?.temperature ??
      DEFAULT_TEMPERATURE,
    addOns: getAddOnsFormValue(appProperties?.tool_sets),
    codeInterpreter:
      appProperties?.tool_sets?.some((toolset) => toolset.type === ToolsetTypes.CodeInterpreter) ??
      false,
    attachmentsEnabled: inputAttachmentTypes.length > 0,
    inputAttachmentTypes,
    maxInputAttachments:
      normalizeMaxInputAttachments(app?.maxInputAttachments) ??
      (inputAttachmentTypes.length > 0 ? DEFAULT_MAX_INPUT_ATTACHMENTS : undefined),
    introText: appProperties?.conversation_starters?.intro_text ?? starterDefaults?.introText,
    chatMessageInputDisabled:
      appProperties?.conversation_starters?.chat_message_input_disabled ??
      starterDefaults?.chatMessageInputDisabled ??
      false,
    autoSubmit:
      appProperties?.conversation_starters?.auto_submit ?? starterDefaults?.autoSubmit ?? true,
    starters: [
      ...(appProperties?.conversation_starters?.starters ?? []).map(
        ({ title, text, ...extra }) => ({
          id: nanoid(),
          title,
          text,
          ...(isEmpty(extra) ? {} : { extra }),
        }),
      ),
      { id: nanoid(), title: '', text: '' },
    ],
    toolSupportingModelIds,
    availableModelIds,
    agentSkills: (appProperties?.skills ?? [])
      .filter((s): s is DialSkillRef => s.type === SkillRefType.DialSkill)
      .map((s) => decodeApiUrl(s.url)),
    timestamp,
    processLargeFiles,
    fileTools,
    addAttachment,
    webFetch,
    extraConfig: getQuickApp2ExtraConfig(appProperties),
  };
};
