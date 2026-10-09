import type { CatalogItem } from '@epam/ai-dial-catalog';
import { CatalogEntityType } from '@epam/ai-dial-chat-shared';

import type { DialModel } from '@/types/dial-entities';
import { DialEntityType } from '@/types/dial-entities';
import { doesAgentSupportMcp } from '@/utils/application';
import {
  mapModelToCatalogItem,
  type MapModelToCatalogItemOptions,
} from '@/utils/map-model-to-catalog-item';

/**
 * Whether an agent's transport (MCP or chat completion) can be chosen: only
 * MCP-capable applications are saved with a `transport` (see
 * `getQuickApp2Toolsets`).
 */
export const canConfigureAgentTransport = (agent?: DialModel): boolean =>
  agent?.type === DialEntityType.Application && doesAgentSupportMcp(agent);

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
