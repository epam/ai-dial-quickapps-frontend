import { DEFAULT_QUICK_APPS_SCHEMA_2_ID } from '@/constants/quick-apps';
import { decodeApiUrl, isApplicationId, parseEntityApiKey, splitEntityId } from '@/utils/api';
import {
  DialAppToolset,
  DialDeploymentSimpleTool,
  MCPToolset,
  QuickApp2Config,
} from '@/types/quick-apps';

import omit from 'lodash-es/omit';

const getQuickAppsSchemaId2 = () =>
  process.env.NEXT_PUBLIC_QUICK_APPS_SCHEMA_2_ID ?? DEFAULT_QUICK_APPS_SCHEMA_2_ID;

export interface DialAIEntityModel {
  applicationTypeSchemaId?: string;
  mcp?: boolean;
  features?: { mcp?: boolean };
  [key: string]: unknown;
}

export const isQuickApp2 = (entity: DialAIEntityModel) =>
  entity.applicationTypeSchemaId === getQuickAppsSchemaId2();

export const isQuickApp2Editor = (type: string): boolean => getQuickAppsSchemaId2().endsWith(type);

export const getQuickApp2Config = (entity: { applicationProperties?: unknown }): QuickApp2Config =>
  entity.applicationProperties as QuickApp2Config;

export const getQuick2AppDocumentUrl = (entity?: { applicationProperties?: unknown }) =>
  entity ? getQuickApp2Config(entity)?.contexts?.map((c) => c.url) : undefined;

export const migrateMCPToolsetIdName = (item: MCPToolset & { dial_id?: string }): MCPToolset => {
  if (typeof item.dial_id === 'string') {
    return {
      ...omit(item, ['dial_id']),
      deployment_id: item.deployment_id ? item.deployment_id : item.dial_id,
    } as MCPToolset;
  }
  return item as MCPToolset;
};

export const getQuickAppItemNameFromConfig = (
  item: MCPToolset | DialAppToolset | DialDeploymentSimpleTool,
): string => {
  if ('deployment_id' in item && 'name' in item) {
    return (
      (item as DialAppToolset).name ||
      decodeApiUrl(
        parseEntityApiKey(splitEntityId(item.deployment_id).name, {
          parseVersion: true,
        }).name,
      )
    );
  }

  if (isApplicationId(item.deployment_id)) {
    return decodeApiUrl(
      parseEntityApiKey(splitEntityId(item.deployment_id).name, {
        parseVersion: true,
      }).name,
    );
  }

  if ('open_ai_tool' in item) {
    return (item.open_ai_tool as { function?: { name?: string } })?.function?.name || 'OpenAI Tool';
  }

  if ('name' in item && typeof (item as MCPToolset).name === 'string') {
    return (item as MCPToolset).name!;
  }

  if (!item.deployment_id) {
    if ('template_name' in item) return (item as { template_name: string }).template_name;
    console.error('Dial Tool is missing deployment_id:', item);
    return 'unknown';
  }

  return item.deployment_id;
};

export const doesAgentSupportMcp = (entity?: DialAIEntityModel): boolean =>
  !!entity?.mcp || !!entity?.features?.mcp;

export const doesModelAllowTemperature = (model?: DialAIEntityModel): boolean =>
  !!(model as { features?: { temperature?: boolean } } | undefined)?.features?.temperature;

export const isEntityIdPublic = (entity: { id: string }): boolean =>
  entity.id.startsWith('public/');

export const getEntityDisplayName = (
  id: string,
  allEntitiesMap: Record<string, { name?: string } | undefined>,
): string => {
  const entity = allEntitiesMap[id];
  if (entity?.name) return entity.name;
  const parts = id.split('/');
  return decodeURIComponent(parts[parts.length - 1]);
};

export const isDialAiEntityModel = (entity: { type?: string }): boolean =>
  entity?.type === 'application' || entity?.type === 'model';

export const isToolsetEntityModel = (entity: { type?: string }): boolean =>
  entity?.type === 'toolset';

export const getSharedTooltip = (context: string): string =>
  `Cannot change the ${context} of a shared application.`;
