import { z } from 'zod';

z.config({ jitless: true });

import {
  ORCHESTRATOR_ATTACHMENT_STRATEGY_VALUE,
  REPRESENTATION_TOOLING_FEATURE_VALUE,
  WEB_FETCH_FEATURE_VALUE,
} from '@/constants/quick-apps';
import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import {
  doesAgentSupportMcp,
  doesModelAllowTemperature,
  getQuick2AppDocumentUrl,
  getQuickAppItemNameFromConfig,
  migrateMCPToolsetIdName,
} from '@/utils/application';
import { decodeApiUrl, encodeApiUrl, isApplicationId, isToolsetId } from '@/utils/api';
import type { DialAIEntityModel, LocalizedText } from '@/types/dial-entities';
import { DialEntityType } from '@/types/dial-entities';
import { getLocalizedText } from '@/utils/get-localized-text';
import {
  AnyToolset,
  CodeInterpreterTemplate,
  CodeInterpreterToolset,
  ContextType,
  DialAppToolset,
  DialAppTransportType,
  DialDeploymentSimpleTool,
  DialDeploymentToolset,
  DialDeploymentToolsetName,
  DialDeploymentToolsetToolTypes,
  DialSkillRef,
  MCPToolset,
  QuickApp2Config,
  SkillRefType,
  SystemPromptType,
  TimestampInjectionStrategy,
  ToolsetTypes,
  UnknownToolset,
} from '@/types/quick-apps';
import {
  isDialAppToolset,
  isDialDeploymentSimpleTool,
  isDialDeploymentToolset,
  isMcpToolset,
  isUnknownToolset,
} from '@/utils/toolset-guards';

import omit from 'lodash-es/omit';
import sortBy from 'lodash-es/sortBy';
import { nanoid } from 'nanoid';
import { AddOnSchemaKeys } from '@/types/quick-app-form';

const DEFAULT_TEMPERATURE = 0.5;

const AddOnSchema = z.object({
  [AddOnSchemaKeys.id]: z.string(),
  [AddOnSchemaKeys.tool]: z.record(z.string(), z.any()).optional(),
  [AddOnSchemaKeys.isDialDeploymentTool]: z.boolean().optional(),
});

export type AddOnEntry = z.infer<typeof AddOnSchema>;

const AttachmentTypesSchema = z.array(z.string());
export const MaxInputAttachmentsSchema = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.coerce.number().int().positive().optional(),
);

export const isValidMaxInputAttachments = (value: unknown): boolean =>
  MaxInputAttachmentsSchema.safeParse(value).success;

export const QuickApp2Schema = z
  .object({
    // `refine`, not `trim()`: the saved system prompt must keep its whitespace as typed.
    instructions: z.string().refine((value) => value.trim().length > 0, {
      message: QuickAppEditorI18nKeys.InstructionsRequired,
    }),
    temperature: z.number(),
    documentRelativeUrl: z.array(z.string()),
    model: z.string(),
    addOns: z.array(AddOnSchema),
    codeInterpreter: z.boolean(),
    // Form-only: drives the Attachments switch and is never sent to chat-api.
    attachmentsEnabled: z.boolean(),
    inputAttachmentTypes: AttachmentTypesSchema,
    maxInputAttachments: MaxInputAttachmentsSchema,
    introText: z.string().optional(),
    chatMessageInputDisabled: z.boolean(),
    autoSubmit: z.boolean(),
    starters: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        text: z.string(),
      }),
    ),
    toolSupportingModelIds: z.array(z.string()).optional(),
    availableModelIds: z.array(z.string()).optional(),
    agentSkills: z.array(z.string()),
    timestamp: z.boolean(),
    processLargeFiles: z.boolean(),
    fileTools: z.boolean(),
    addAttachment: z.boolean(),
    webFetch: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.attachmentsEnabled && data.inputAttachmentTypes.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['inputAttachmentTypes'],
        message: QuickAppEditorI18nKeys.AttachmentTypesRequired,
      });
    }

    const modelExists = !data.availableModelIds || data.availableModelIds.includes(data.model);
    if (!modelExists) {
      ctx.addIssue({
        code: 'custom',
        path: ['model'],
        message: 'Not available agent selected. Please, change the agent to proceed',
      });
      return;
    }

    if (data.toolSupportingModelIds?.includes(data.model) === false) {
      ctx.addIssue({
        code: 'custom',
        path: ['model'],
        message: 'Selected model does not support tools',
      });
    }
  });

export type QuickApp2Form = z.infer<typeof QuickApp2Schema>;

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
): string => {
  if (existingModelId) return existingModelId;
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
): QuickApp2Form => {
  const appProperties = app?.applicationProperties as QuickApp2Config | undefined;
  const inputAttachmentTypes = (app?.inputAttachmentTypes as string[] | undefined) ?? [];
  const model = resolveDefaultModelId(
    appProperties?.orchestrator?.deployment?.deployment_id,
    toolSupportingModelIds,
    availableModelIds,
    defaultModelId,
  );
  const timestamp =
    'timestamp' in (appProperties?.features ?? {}) ? !!appProperties?.features?.timestamp : true;
  const processLargeFiles =
    'attachment_strategy' in (appProperties?.orchestrator ?? {})
      ? !!appProperties?.orchestrator?.attachment_strategy
      : false;
  const fileTools =
    'dial_files' in (appProperties?.features ?? {}) ? !!appProperties?.features?.dial_files : false;
  const addAttachment =
    'representation_tooling' in (appProperties?.features ?? {})
      ? !!appProperties?.features?.representation_tooling?.add_attachment
      : false;
  const webFetch =
    'web_fetch' in (appProperties?.features ?? {})
      ? !!appProperties?.features?.web_fetch?.enabled
      : false;

  return {
    documentRelativeUrl: getQuick2AppDocumentUrl(app) ?? [],
    model,
    instructions: appProperties?.orchestrator?.system_prompt?.content ?? '',
    temperature:
      appProperties?.orchestrator?.deployment?.parameters?.temperature ?? DEFAULT_TEMPERATURE,
    addOns: getAddOnsFormValue(appProperties?.tool_sets),
    codeInterpreter:
      appProperties?.tool_sets?.some((toolset) => toolset.type === ToolsetTypes.CodeInterpreter) ??
      false,
    attachmentsEnabled: inputAttachmentTypes.length > 0,
    inputAttachmentTypes,
    maxInputAttachments: app?.maxInputAttachments as number | undefined,
    introText: appProperties?.conversation_starters?.intro_text,
    chatMessageInputDisabled:
      appProperties?.conversation_starters?.chat_message_input_disabled ?? false,
    autoSubmit: appProperties?.conversation_starters?.auto_submit ?? true,
    starters: [
      ...(appProperties?.conversation_starters?.starters ?? []).map((starter) => ({
        ...starter,
        id: nanoid(),
      })),
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
  };
};

export const buildQuickApp2Config = ({
  data,
  allEntitiesMap,
  existingConfig,
  language,
}: {
  data: QuickApp2Form;
  allEntitiesMap: Record<
    string,
    DialAIEntityModel & { id: string; name?: LocalizedText; type?: string }
  >;
  existingConfig?: QuickApp2Config;
  language: string;
}): QuickApp2Config => {
  const toolSets = getQuickApp2Toolsets({ allEntitiesMap, data, language });

  const starters = data.starters
    .filter((s) => s.title.trim() || s.text.trim())
    .map(({ title, text }) => ({ title, text }));

  const skills = data.agentSkills.map((url) => ({
    type: SkillRefType.DialSkill,
    url,
  }));

  const timestampFeature = data.timestamp
    ? { injection_strategy: TimestampInjectionStrategy.ToolCall }
    : null;
  const model = allEntitiesMap[data.model];
  const supportsAttachments = !!(model?.inputAttachmentTypes as string[] | undefined)?.length;

  return {
    orchestrator: {
      ...existingConfig?.orchestrator,
      deployment: {
        deployment_id: data.model,
        parameters: doesModelAllowTemperature(model)
          ? { temperature: data.temperature }
          : undefined,
      },
      system_prompt: {
        type: SystemPromptType.Custom,
        variables: existingConfig?.orchestrator?.system_prompt?.variables ?? {},
        content: data.instructions,
      },
      ...(supportsAttachments && {
        attachment_strategy: data.processLargeFiles ? ORCHESTRATOR_ATTACHMENT_STRATEGY_VALUE : null,
      }),
    },
    contexts: data.documentRelativeUrl.map((url) => ({
      url,
      type: ContextType.File,
    })),
    tool_sets: toolSets,
    conversation_starters: starters.length
      ? {
          intro_text: data.introText || undefined,
          chat_message_input_disabled: data.chatMessageInputDisabled,
          auto_submit: data.autoSubmit,
          starters,
        }
      : null,
    ...(skills.length && { skills }),
    features: {
      ...existingConfig?.features,
      timestamp: timestampFeature,
      dial_files: data.fileTools ? {} : null,
      representation_tooling: data.addAttachment ? REPRESENTATION_TOOLING_FEATURE_VALUE : null,
      web_fetch: data.webFetch ? WEB_FETCH_FEATURE_VALUE : null,
    },
  };
};

export const getQuickApp2Toolsets = ({
  allEntitiesMap,
  data,
  language,
}: {
  allEntitiesMap: Record<
    string,
    DialAIEntityModel & { id: string; name?: LocalizedText; type?: string }
  >;
  data: QuickApp2Form;
  language: string;
}): AnyToolset[] => {
  const { dialDeploymentsToolsets, dialMCPToolsets, otherToolsets, dialAppToolsets } =
    data.addOns.reduce<{
      dialDeploymentsToolsets: DialDeploymentSimpleTool[];
      dialMCPToolsets: MCPToolset[];
      dialAppToolsets: DialAppToolset[];
      otherToolsets: UnknownToolset[];
    }>(
      (acc, addOn) => {
        const entity = allEntitiesMap[addOn[AddOnSchemaKeys.id]];
        const toolData = omit(addOn[AddOnSchemaKeys.tool] ?? {}, Object.values(AddOnSchemaKeys));

        if (!entity) {
          if (isApplicationId(addOn[AddOnSchemaKeys.id])) {
            acc.dialAppToolsets.push({
              ...toolData,
              name: getQuickAppItemNameFromConfig(toolData as DialAppToolset),
              type: ToolsetTypes.DialApp,
              deployment_id: encodeApiUrl(addOn[AddOnSchemaKeys.id]),
            });
          } else if (isToolsetId(addOn[AddOnSchemaKeys.id])) {
            acc.dialMCPToolsets.push({
              ...toolData,
              deployment_id: encodeApiUrl(addOn[AddOnSchemaKeys.id]),
              type: ToolsetTypes.DialMcp,
            });
          } else if (addOn[AddOnSchemaKeys.tool] && addOn[AddOnSchemaKeys.isDialDeploymentTool]) {
            acc.dialDeploymentsToolsets.push(toolData as DialDeploymentSimpleTool);
          } else if (addOn[AddOnSchemaKeys.tool]) {
            acc.otherToolsets.push(toolData);
          }
          return acc;
        }

        const isModel = entity.type === DialEntityType.Model;
        const isApp = entity.type === DialEntityType.Application;

        if (isModel) {
          acc.dialDeploymentsToolsets.push({
            ...toolData,
            type: DialDeploymentToolsetToolTypes.DialDeploymentSimple,
            deployment_id: encodeApiUrl(entity.id),
          });
        } else if (isApp) {
          acc.dialAppToolsets.push({
            ...toolData,
            name: getLocalizedText(entity.name, language, entity.id),
            type: ToolsetTypes.DialApp,
            deployment_id: encodeApiUrl(entity.id),
            ...(doesAgentSupportMcp(entity) && {
              transport: (toolData as DialAppToolset).transport ?? DialAppTransportType.MCP,
            }),
          });
        } else {
          acc.dialMCPToolsets.push({
            ...toolData,
            deployment_id: encodeApiUrl(entity.id),
            type: ToolsetTypes.DialMcp,
          });
        }

        return acc;
      },
      {
        dialDeploymentsToolsets: [],
        dialMCPToolsets: [],
        dialAppToolsets: [],
        otherToolsets: [],
      },
    );

  return [
    ...dialMCPToolsets,
    ...dialAppToolsets,
    {
      name: DialDeploymentToolsetName.Default,
      type: ToolsetTypes.DialDeployment,
      tools: [...dialDeploymentsToolsets],
    } as DialDeploymentToolset,
    ...otherToolsets,
    ...(data.codeInterpreter
      ? [
          {
            template_name: CodeInterpreterTemplate.PyInterpreter,
            type: ToolsetTypes.CodeInterpreter,
          } as CodeInterpreterToolset,
        ]
      : []),
  ];
};
