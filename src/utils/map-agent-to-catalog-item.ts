import type { CatalogItem } from '@epam/ai-dial-catalog';
import { CatalogEntityType } from '@epam/ai-dial-chat-shared';

import type { DialModel } from '@/types/dial-entities';
import { DialAppTransportType } from '@/types/quick-apps';
import { ResourceScope } from '@/types/resource-scope';
import { doesAgentSupportMcp } from '@/utils/application';
import { getCatalogFolder } from '@/utils/entity-scope';
import { formatUpdatedAtDate } from '@/utils/get-updated-at-timestamp';
import {
  getModelScopeInfo,
  mapModelToCatalogItem,
  type MapModelToCatalogItemOptions,
} from '@/utils/map-model-to-catalog-item';
import { CATALOG_FOLDER_SEPARATOR, type OverviewRow } from '@/utils/map-toolset-to-catalog-item';

/**
 * Whether an agent's transport (MCP or chat completion) can be chosen: only
 * MCP-capable applications are saved with a `transport` (see
 * `getQuickApp2Toolsets`).
 */
export const canConfigureAgentTransport = (agent?: DialModel): boolean =>
  agent?.type === 'application' && doesAgentSupportMcp(agent);

/**
 * Maps an agent — an application, MCP agent or model — to a catalog list row.
 * Models keep the Model type, so the Type column tells them apart.
 */
export const mapAgentToCatalogItem = (
  agent: DialModel,
  options: MapModelToCatalogItemOptions,
): CatalogItem => ({
  ...mapModelToCatalogItem(agent, options),
  type: agent.type === 'model' ? CatalogEntityType.Model : CatalogEntityType.Agent,
});

export interface AgentOverviewLabels {
  folder: string;
  updated: string;
  version: string;
  connection: string;
  mcp: string;
  chatCompletion: string;
}

export interface GetAgentOverviewRowsOptions {
  language: string;
  userBucket?: string;
  scopeLabels: Record<ResourceScope, string>;
  /** The transport saved for this entry, if any. */
  transport?: DialAppTransportType;
  labels: AgentOverviewLabels;
}

const getConnectionLabel = (
  agent: DialModel,
  transport: DialAppTransportType | undefined,
  labels: AgentOverviewLabels,
): string => {
  if (!canConfigureAgentTransport(agent)) return '';
  // Unset reads as MCP, matching the save default; `auto` has no label.
  if (transport == null || transport === DialAppTransportType.MCP) return labels.mcp;
  if (transport === DialAppTransportType.ChatCompletion) return labels.chatCompletion;
  return '';
};

/** Label/value rows of an agent's Overview tab; rows without a value are left out. */
export const getAgentOverviewRows = (
  agent: DialModel,
  { language, userBucket, scopeLabels, transport, labels }: GetAgentOverviewRowsOptions,
): OverviewRow[] => {
  const folder = getCatalogFolder(getModelScopeInfo(agent.id, userBucket), scopeLabels);
  const rows: OverviewRow[] = [
    { label: labels.folder, value: folder.join(CATALOG_FOLDER_SEPARATOR) },
    { label: labels.updated, value: formatUpdatedAtDate(agent.updatedAt, language) },
    { label: labels.version, value: agent.version ?? '' },
    { label: labels.connection, value: getConnectionLabel(agent, transport, labels) },
  ];
  return rows.filter((row) => row.value !== '');
};
