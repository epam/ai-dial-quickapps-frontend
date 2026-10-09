import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { decodeApiUrl, isApplicationId, parseEntityApiKey, splitEntityId } from '@/utils/api';
import type { DialAIEntityModel } from '@/types/dial-entities';
import {
  DialAppToolset,
  DialDeploymentSimpleTool,
  MCPToolset,
  QuickApp2Config,
} from '@/types/quick-apps';

import omit from 'lodash-es/omit';

const getQuickApp2Config = (entity: { applicationProperties?: unknown }): QuickApp2Config =>
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
          shouldParseVersion: true,
        }).name,
      )
    );
  }

  if (isApplicationId(item.deployment_id)) {
    return decodeApiUrl(
      parseEntityApiKey(splitEntityId(item.deployment_id).name, {
        shouldParseVersion: true,
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

// Half-step thresholds keep 0.3 / 0.7 (and float noise like 0.1 + 0.2) in the intended band.
export const getTemperatureScaleLabelKey = (value: number): QuickAppEditorI18nKeys => {
  if (value < 0.35) return QuickAppEditorI18nKeys.TemperaturePrecise;
  if (value > 0.65) return QuickAppEditorI18nKeys.TemperatureCreative;
  return QuickAppEditorI18nKeys.TemperatureNeutral;
};

export const isEntityIdPublic = (entity: { id: string }): boolean =>
  entity.id.startsWith('public/');
