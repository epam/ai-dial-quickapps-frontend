import { z } from 'zod';

z.config({ jitless: true });

import {
  DEFAULT_QUICK_APPS_MODEL,
  DialDeploymentToolsetToolTypes,
  ToolsetTypes,
} from '@/constants/quick-apps';
import {
  doesAgentSupportMcp,
  getQuick2AppDocumentUrl,
  getQuickAppItemNameFromConfig,
  migrateMCPToolsetIdName,
  type DialAIEntityModel,
} from '@/utils/application';
import { decodeApiUrl, encodeApiUrl, isApplicationId, isToolsetId } from '@/utils/api';
import {
  AnyToolset,
  CodeInterpreterToolset,
  DialAppToolset,
  DialAppTransportType,
  DialDeploymentSimpleTool,
  DialPromptSkill,
  MCPToolset,
  QuickApp2Config,
  UnknownToolset,
  isDialAppToolset,
  isDialDeploymentSimpleTool,
  isDialDeploymentToolset,
  isMcpToolset,
  isUnknownToolset,
} from '@/types/quick-apps';

import omit from 'lodash-es/omit';
import sortBy from 'lodash-es/sortBy';
import { nanoid } from 'nanoid';

export const DEFAULT_TEMPERATURE = 1;

export enum AgentOrToolsetSchemaKeys {
  id = '[schema]:id',
  tool = '[schema]:tool',
  isDialDeploymentTool = '[schema]:isDialDeploymentTool',
  name = '[schema]:name',
}

const AgentOrToolsetSchema = z.object({
  [AgentOrToolsetSchemaKeys.id]: z.string(),
  [AgentOrToolsetSchemaKeys.tool]: z
    .record(z.string(), z.any())
    .optional(),
  [AgentOrToolsetSchemaKeys.isDialDeploymentTool]: z.boolean().optional(),
});

type AgentOrToolsetFormType = z.infer<typeof AgentOrToolsetSchema>;

const AttachmentTypesSchema = z.array(z.string());
const MaxInputAttachmentsSchema = z.coerce.number().int().positive();

export const QuickApp2Schema = z
  .object({
    instructions: z.string(),
    temperature: z.number(),
    documentRelativeUrl: z.array(z.string()),
    model: z.string(),
    agentsAndToolsets: z.array(AgentOrToolsetSchema),
    codeInterpreter: z.boolean(),
    inputAttachmentTypes: AttachmentTypesSchema,
    maxInputAttachments: MaxInputAttachmentsSchema.optional(),
    isJsonView: z.boolean(),
    agentsAndToolsetsJson: z.string(),
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
  })
  .superRefine((data, ctx) => {
    if (data.isJsonView) {
      try {
        const parsed: unknown[] = JSON.parse(data.agentsAndToolsetsJson);
        if (!Array.isArray(parsed)) {
          ctx.addIssue({
            code: 'custom',
            path: ['agentsAndToolsetsJson'],
            message: 'Should be an array',
          });
        }
      } catch {
        ctx.addIssue({
          code: 'custom',
          path: ['agentsAndToolsetsJson'],
          message: 'Should be a valid JSON',
        });
      }
    }

    const modelExists =
      !data.availableModelIds || data.availableModelIds.includes(data.model);
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

export const getAgentsAndToolsetsFormValue = (
  tools?: AnyToolset[],
): AgentOrToolsetFormType[] => {
  const deploymentTools =
    tools?.filter(isDialDeploymentToolset)?.flatMap((t) => t.tools) ?? [];
  const mcpToolsets = (tools?.filter(isMcpToolset) ?? []).map(
    migrateMCPToolsetIdName,
  );
  const dialAppToolsets = tools?.filter(isDialAppToolset) ?? [];
  const unknownToolsets = tools?.filter(isUnknownToolset) ?? [];

  const markedDeploymentTools = deploymentTools.map((item) => ({
    ...item,
    [AgentOrToolsetSchemaKeys.name]: getQuickAppItemNameFromConfig(item),
    [AgentOrToolsetSchemaKeys.isDialDeploymentTool]: true,
  }));
  const allItems = [...mcpToolsets, ...unknownToolsets, ...dialAppToolsets].map(
    (item) => ({
      ...item,
      [AgentOrToolsetSchemaKeys.name]: getQuickAppItemNameFromConfig(
        item as MCPToolset,
      ),
    }),
  );

  const sortedItems = sortBy(
    [...markedDeploymentTools, ...allItems],
    [(item) => item[AgentOrToolsetSchemaKeys.name].toLowerCase()],
  );

  return sortedItems.map((item) => {
    const id =
      isUnknownToolset(item) && !isDialDeploymentSimpleTool(item)
        ? undefined
        : (item as DialDeploymentSimpleTool).deployment_id;
    return {
      [AgentOrToolsetSchemaKeys.id]: id
        ? decodeApiUrl(id)
        : (item[AgentOrToolsetSchemaKeys.name] ?? 'unknown'),
      [AgentOrToolsetSchemaKeys.tool]: item,
      [AgentOrToolsetSchemaKeys.isDialDeploymentTool]:
        AgentOrToolsetSchemaKeys.isDialDeploymentTool in item
          ? (item[AgentOrToolsetSchemaKeys.isDialDeploymentTool] as boolean)
          : false,
    };
  });
};

export const getQuickApp2FormData = (
  app?: { applicationProperties?: unknown },
  toolSupportingModelIds?: string[],
  availableModelIds?: string[],
): QuickApp2Form => {
  const appProperties = app?.applicationProperties as QuickApp2Config | undefined;
  let model = appProperties?.orchestrator?.deployment?.deployment_id;
  if (!model) {
    const defaultModelId =
      process.env.NEXT_PUBLIC_QUICK_APPS_DEFAULT_MODEL ?? DEFAULT_QUICK_APPS_MODEL;
    model = toolSupportingModelIds?.includes(defaultModelId)
      ? defaultModelId
      : (toolSupportingModelIds?.[0] ?? '');
  }
  const timestamp =
    'timestamp' in (appProperties?.features ?? {})
      ? !!appProperties?.features?.timestamp
      : true;

  return {
    documentRelativeUrl: getQuick2AppDocumentUrl(app) ?? [],
    model,
    instructions: appProperties?.orchestrator?.system_prompt?.content ?? '',
    temperature:
      appProperties?.orchestrator?.deployment?.parameters?.temperature ??
      DEFAULT_TEMPERATURE,
    agentsAndToolsets: getAgentsAndToolsetsFormValue(appProperties?.tool_sets),
    codeInterpreter:
      appProperties?.tool_sets?.some(
        (toolset) => toolset.type === ToolsetTypes.CodeInterpreter,
      ) ?? false,
    inputAttachmentTypes: [],
    maxInputAttachments: undefined,
    agentsAndToolsetsJson: JSON.stringify(
      appProperties?.tool_sets ?? [],
      null,
      2,
    ),
    introText: appProperties?.conversation_starters?.intro_text,
    chatMessageInputDisabled:
      appProperties?.conversation_starters?.chat_message_input_disabled ?? false,
    autoSubmit: appProperties?.conversation_starters?.auto_submit ?? true,
    starters: [
      ...(appProperties?.conversation_starters?.starters ?? []).map(
        (starter) => ({ ...starter, id: nanoid() }),
      ),
      { id: nanoid(), title: '', text: '' },
    ],
    isJsonView: false,
    toolSupportingModelIds,
    availableModelIds,
    agentSkills: (appProperties?.skills ?? [])
      .filter((s): s is DialPromptSkill => s.type === 'dial-prompt')
      .map((s) => decodeApiUrl(s.url)),
    timestamp,
  };
};

export const buildQuickApp2Config = ({
  data,
  allEntitiesMap,
  existingConfig,
}: {
  data: QuickApp2Form;
  allEntitiesMap: Record<string, DialAIEntityModel & { id: string; name?: string; type?: string }>;
  existingConfig?: QuickApp2Config;
}): QuickApp2Config => {
  const toolSets = getQuickApp2Toolsets({ allEntitiesMap, data });

  const starters = data.starters
    .filter((s) => s.title.trim() || s.text.trim())
    .map(({ title, text }) => ({ title, text }));

  const skills = data.agentSkills.map((url) => ({
    type: 'dial-prompt' as const,
    url,
  }));

  const timestampFeature = data.timestamp
    ? { injection_strategy: 'tool_call' as const }
    : null;

  return {
    orchestrator: {
      deployment: {
        deployment_id: data.model,
        parameters: { temperature: data.temperature },
      },
      system_prompt: {
        type: 'custom',
        variables: existingConfig?.orchestrator?.system_prompt?.variables ?? {},
        content: data.instructions,
      },
    },
    contexts: existingConfig?.contexts ?? [],
    tool_sets: toolSets,
    conversation_starters: {
      intro_text: data.introText || undefined,
      chat_message_input_disabled: data.chatMessageInputDisabled || undefined,
      auto_submit: data.autoSubmit,
      starters,
    },
    ...(data.inputAttachmentTypes.length && {
      input_attachment_types: data.inputAttachmentTypes,
    }),
    ...(data.maxInputAttachments != null && {
      max_input_attachments: data.maxInputAttachments,
    }),
    ...(skills.length && { skills }),
    features: { timestamp: timestampFeature },
  };
};

export const getQuickApp2Toolsets = ({
  allEntitiesMap,
  data,
}: {
  allEntitiesMap: Record<string, DialAIEntityModel & { id: string; name?: string; type?: string }>;
  data: QuickApp2Form;
}): AnyToolset[] => {
  const {
    dialDeploymentsToolsets,
    dialMCPToolsets,
    otherToolsets,
    dialAppToolsets,
  } = data.agentsAndToolsets.reduce<{
    dialDeploymentsToolsets: DialDeploymentSimpleTool[];
    dialMCPToolsets: MCPToolset[];
    dialAppToolsets: DialAppToolset[];
    otherToolsets: UnknownToolset[];
  }>(
    (acc, agentAndToolset) => {
      const entity = allEntitiesMap[agentAndToolset[AgentOrToolsetSchemaKeys.id]];
      const toolData = omit(
        agentAndToolset[AgentOrToolsetSchemaKeys.tool] ?? {},
        Object.values(AgentOrToolsetSchemaKeys),
      );

      if (!entity) {
        if (isApplicationId(agentAndToolset[AgentOrToolsetSchemaKeys.id])) {
          acc.dialAppToolsets.push({
            ...toolData,
            name: getQuickAppItemNameFromConfig(toolData as DialAppToolset),
            type: ToolsetTypes.DialApp,
            deployment_id: encodeApiUrl(agentAndToolset[AgentOrToolsetSchemaKeys.id]),
          });
        } else if (isToolsetId(agentAndToolset[AgentOrToolsetSchemaKeys.id])) {
          acc.dialMCPToolsets.push({
            ...toolData,
            deployment_id: encodeApiUrl(agentAndToolset[AgentOrToolsetSchemaKeys.id]),
            type: ToolsetTypes.DialMcp,
          });
        } else if (
          agentAndToolset[AgentOrToolsetSchemaKeys.tool] &&
          agentAndToolset[AgentOrToolsetSchemaKeys.isDialDeploymentTool]
        ) {
          acc.dialDeploymentsToolsets.push(toolData as DialDeploymentSimpleTool);
        } else if (agentAndToolset[AgentOrToolsetSchemaKeys.tool]) {
          acc.otherToolsets.push(toolData);
        }
        return acc;
      }

      const isModel = entity.type === 'model';
      const isApp = entity.type === 'application';

      if (isModel) {
        acc.dialDeploymentsToolsets.push({
          ...toolData,
          type: DialDeploymentToolsetToolTypes.DialDeploymentSimple,
          deployment_id: encodeApiUrl(entity.id),
        });
      } else if (isApp) {
        acc.dialAppToolsets.push({
          ...toolData,
          name: entity.name ?? entity.id,
          type: ToolsetTypes.DialApp,
          deployment_id: encodeApiUrl(entity.id),
          ...(doesAgentSupportMcp(entity) && {
            transport:
              (toolData as DialAppToolset).transport ?? DialAppTransportType.MCP,
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
      name: 'dial-deployment-tool-set',
      type: ToolsetTypes.DialDeployment,
      tools: [...dialDeploymentsToolsets],
    },
    ...otherToolsets,
    ...(data.codeInterpreter
      ? [
          {
            template_name: 'py_interpreter',
            type: ToolsetTypes.CodeInterpreter,
          } as CodeInterpreterToolset,
        ]
      : []),
  ];
};
