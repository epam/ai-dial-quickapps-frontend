import {
  DEFAULT_AGENT_TRANSPORT,
  ORCHESTRATOR_ATTACHMENT_STRATEGY_VALUE,
  REPRESENTATION_TOOLING_FEATURE_VALUE,
  WEB_FETCH_FEATURE_VALUE,
} from '@/constants/quick-apps';
import {
  doesAgentSupportMcp,
  doesModelAllowTemperature,
  getQuickAppItemNameFromConfig,
} from '@/utils/application';
import { encodeApiUrl, isApplicationId, isToolsetId } from '@/utils/api';
import type { DialAIEntityModel, LocalizedText } from '@/types/dial-entities';
import { DialEntityType } from '@/types/dial-entities';
import { getLocalizedText } from '@/utils/get-localized-text';
import {
  findExtraContext,
  findExtraSkill,
  isOwnedContext,
  isOwnedSkill,
} from '@/utils/quick-app-extra-config';
import {
  AnyToolset,
  CodeInterpreterTemplate,
  CodeInterpreterToolset,
  ContextType,
  DialAppToolset,
  DialDeploymentSimpleTool,
  DialDeploymentToolset,
  DialDeploymentToolsetName,
  DialDeploymentToolsetToolTypes,
  MCPToolset,
  QuickApp2Config,
  SkillRefType,
  SystemPromptType,
  TimestampInjectionStrategy,
  ToolsetTypes,
  UnknownToolset,
} from '@/types/quick-apps';
import isEmpty from 'lodash-es/isEmpty';
import isPlainObject from 'lodash-es/isPlainObject';
import omit from 'lodash-es/omit';
import { AddOnSchemaKeys } from '@/types/quick-app-form';
import type { QuickApp2Form } from '@/types/quick-app-form';

// `parameters` is the stored object, with the form's temperature on top for a model that supports
// it. For any other model the stored parameters are kept as they are and no temperature is
// invented from the form default. While the model is not loaded nothing can be said about support,
// so a stored temperature follows the form value and nothing is added.
const getDeploymentParameters = (
  extraParameters: unknown,
  model: DialAIEntityModel | undefined,
  temperature: number,
): Record<string, unknown> | undefined => {
  const parameters = isPlainObject(extraParameters)
    ? (extraParameters as Record<string, unknown>)
    : {};
  if (model && doesModelAllowTemperature(model)) return { ...parameters, temperature };
  if (!model && 'temperature' in parameters) return { ...parameters, temperature };
  return isEmpty(parameters) ? undefined : parameters;
};

export const buildQuickApp2Config = ({
  data,
  allEntitiesMap,
  language,
}: {
  data: QuickApp2Form;
  allEntitiesMap: Record<
    string,
    DialAIEntityModel & { id: string; name?: LocalizedText; type?: string }
  >;
  language: string;
}): QuickApp2Config => {
  const toolSets = getQuickApp2Toolsets({ allEntitiesMap, data, language });
  const extra = (data.extraConfig ?? {}) as Record<string, unknown>;
  const {
    orchestrator: extraOrchestrator,
    contexts: extraContexts,
    skills: extraSkills,
    conversation_starters: extraStarters,
    features: extraFeatures,
    ...extraRest
  } = extra as {
    orchestrator?: QuickApp2Config['orchestrator'];
    contexts?: unknown[];
    skills?: unknown[];
    conversation_starters?: object;
    features?: object;
  } & Record<string, unknown>;

  const starters = data.starters
    .filter((s) => s.title.trim() || s.text.trim())
    .map(({ title, text, extra: starterExtra }) => ({ ...starterExtra, title, text }));

  const skills = [
    ...data.agentSkills.map((url) => ({
      ...findExtraSkill(extra, url),
      type: SkillRefType.DialSkill,
      url,
    })),
    ...(extraSkills ?? []).filter((skill) => !isOwnedSkill(skill)),
  ];

  const timestampFeature = data.timestamp
    ? { injection_strategy: TimestampInjectionStrategy.ToolCall }
    : null;
  const model = allEntitiesMap[data.model];
  const supportsAttachments = !!(model?.inputAttachmentTypes as string[] | undefined)?.length;
  const parameters = getDeploymentParameters(
    extraOrchestrator?.deployment?.parameters,
    model,
    data.temperature,
  );

  return {
    ...extraRest,
    orchestrator: {
      ...extraOrchestrator,
      deployment: {
        ...extraOrchestrator?.deployment,
        deployment_id: data.model,
        ...(parameters && { parameters: parameters as { temperature: number } }),
      },
      system_prompt: {
        ...extraOrchestrator?.system_prompt,
        type: SystemPromptType.Custom,
        variables: extraOrchestrator?.system_prompt?.variables ?? {},
        content: data.instructions,
      },
      ...(supportsAttachments && {
        attachment_strategy: data.processLargeFiles ? ORCHESTRATOR_ATTACHMENT_STRATEGY_VALUE : null,
      }),
    },
    contexts: [
      ...data.documentRelativeUrl.map((url) => ({
        ...findExtraContext(extra, url),
        url,
        type: ContextType.File,
      })),
      ...(extraContexts ?? []).filter((context) => !isOwnedContext(context)),
    ] as QuickApp2Config['contexts'],
    tool_sets: toolSets,
    conversation_starters: starters.length
      ? {
          ...extraStarters,
          intro_text: data.introText || undefined,
          chat_message_input_disabled: data.chatMessageInputDisabled,
          auto_submit: data.autoSubmit,
          starters,
        }
      : null,
    ...(skills.length && { skills: skills as QuickApp2Config['skills'] }),
    features: {
      ...extraFeatures,
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
              name: getQuickAppItemNameFromConfig(toolData as unknown as DialAppToolset),
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
            acc.dialDeploymentsToolsets.push(toolData as unknown as DialDeploymentSimpleTool);
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
              transport: (toolData as Partial<DialAppToolset>).transport ?? DEFAULT_AGENT_TRANSPORT,
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
