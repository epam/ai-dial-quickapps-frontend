import type { CatalogItem } from '@epam/ai-dial-catalog';
import { CatalogEntityType } from '@epam/ai-dial-chat-shared';

import type { DialModel, ModelsMap } from '@/types/dial-entities';
import { DialEntityType } from '@/types/dial-entities';
import { doesAgentSupportMcp } from '@/utils/application';
import {
  mapModelToCatalogItem,
  type MapModelToCatalogItemOptions,
} from '@/utils/map-model-to-catalog-item';

/**
 * Whether the transport (MCP or chat completion) is a real choice: an
 * MCP-capable application — only those are saved with a `transport` (see
 * `getQuickApp2Toolsets`) — that also serves chat completion. `modelsMap` holds
 * only the chat-interface deployments (see fetchDialModels), so presence there
 * is what makes chat completion usable.
 */
export const canChooseAgentTransport = (
  agent: DialModel | undefined,
  modelsMap: ModelsMap,
): boolean =>
  agent?.type === DialEntityType.Application &&
  doesAgentSupportMcp(agent) &&
  modelsMap[agent.id] != null;

/**
 * Maps an agent — an application, MCP agent or model — to a catalog list row.
 * Models keep the Model type, so the Type column tells them apart.
 */
export const mapAgentToCatalogItem = (
  agent: DialModel,
  options: MapModelToCatalogItemOptions,
): CatalogItem => ({
  ...mapModelToCatalogItem(agent, options),
  type: agent.type === DialEntityType.Model ? CatalogEntityType.Model : CatalogEntityType.Agent,
  // The catalog's rule: an MCP agent's Connect tab shows its MCP endpoint.
  supportsMcp: doesAgentSupportMcp(agent),
});
