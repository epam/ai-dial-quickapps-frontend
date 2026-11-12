import type { AddOnEntry } from '@/types/quick-app-form';
import { AddOnSchemaKeys } from '@/types/quick-app-form';
import { AddOnKind, AddOnResolution } from '@/types/add-on-kind';
import type { DialModel, DialToolset } from '@/types/dial-entities';
import { DialEntityType } from '@/types/dial-entities';
import { DEFAULT_AGENT_TRANSPORT } from '@/constants/quick-apps';
import { DialAppTransportType } from '@/types/quick-apps';
import { doesAgentSupportMcp } from '@/utils/application';
import { isApplicationId, isToolsetId } from '@/utils/api';
import { getLocalizedText } from '@/utils/get-localized-text';

export type AddOnEntity = DialModel | DialToolset;

export type AddOnEntityMap = Record<string, AddOnEntity | undefined>;

export type { AddOnEntry };

/**
 * Every entity an `addOns` entry can point at, keyed by id.
 * Existing apps may contain inline toolset configs with no `deployment_id`
 * (added via the JSON editor) — their entry id is the toolset `name`
 * from the config — so toolsets are also indexed by display name, letting
 * those entries resolve against the toolset list (details, auth status,
 * sign-in). Id-keyed entries always win; the first toolset wins on a
 * display-name collision.
 */
export const buildAddOnEntityMap = (
  models: DialModel[],
  toolsets: DialToolset[],
  mcpAgents: DialModel[],
  language: string,
): AddOnEntityMap => {
  const map: AddOnEntityMap = {};
  for (const entity of [...models, ...toolsets, ...mcpAgents]) {
    map[entity.id] = entity;
  }
  for (const toolset of toolsets) {
    const displayName = getLocalizedText(toolset.name, language, toolset.id);
    if (displayName && !(displayName in map)) {
      map[displayName] = toolset;
    }
  }
  return map;
};

const EMPTY_ID_SET: ReadonlySet<string> = new Set();

/**
 * Which Add-ons row an entry belongs to. Mirrors the branches
 * `getQuickApp2Toolsets` uses to serialize it: models and applications are
 * agents; toolset entities, unresolved `toolsets/…` ids and inline toolset
 * configs (no `deployment_id`) are toolsets.
 */
export const getAddOnKind = (
  entry: AddOnEntry,
  entityMap: AddOnEntityMap,
  mcpOnlyAgentIds: ReadonlySet<string> = EMPTY_ID_SET,
): AddOnKind => {
  const id = entry[AddOnSchemaKeys.id];
  const entity = entityMap[id];

  // Same rule as the DIAL Chat catalog: an application exposing only the MCP
  // interface (no chat) is a toolset; one that also serves chat stays an agent.
  if (entity && mcpOnlyAgentIds.has(id)) return AddOnKind.Toolset;
  // An application that serves chat as well is listed by its transport: added
  // as a tool it is saved with `mcp` (Toolsets row), added as an agent with
  // `chat-completion` (Agents row). No saved transport reads as the default.
  if (entity?.type === DialEntityType.Application && doesAgentSupportMcp(entity)) {
    const transport = (
      entry[AddOnSchemaKeys.tool] as { transport?: DialAppTransportType } | undefined
    )?.transport;
    return (transport ?? DEFAULT_AGENT_TRANSPORT) === DialAppTransportType.MCP
      ? AddOnKind.Toolset
      : AddOnKind.Agent;
  }
  if (entity) {
    return entity.type === DialEntityType.Model || entity.type === DialEntityType.Application
      ? AddOnKind.Agent
      : AddOnKind.Toolset;
  }
  if (isApplicationId(id)) return AddOnKind.Agent;
  if (isToolsetId(id)) return AddOnKind.Toolset;
  if (entry[AddOnSchemaKeys.isDialDeploymentTool]) return AddOnKind.Agent;
  if (entry[AddOnSchemaKeys.tool]) return AddOnKind.Toolset;
  return AddOnKind.Agent;
};

export interface AddOnIdsByKind {
  toolsetIds: string[];
  agentIds: string[];
}

/** Splits the entry ids by row, keeping their order in the array. */
export const partitionAddOnIds = (
  entries: readonly AddOnEntry[],
  entityMap: AddOnEntityMap,
  mcpOnlyAgentIds?: ReadonlySet<string>,
): AddOnIdsByKind =>
  entries.reduce<AddOnIdsByKind>(
    (acc, entry) => {
      const id = entry[AddOnSchemaKeys.id];
      if (getAddOnKind(entry, entityMap, mcpOnlyAgentIds) === AddOnKind.Toolset)
        acc.toolsetIds.push(id);
      else acc.agentIds.push(id);
      return acc;
    },
    { toolsetIds: [], agentIds: [] },
  );

/**
 * Whether an entry's entity is in the catalog, defined inline in the
 * application's JSON (no entity and no catalog id — e.g. a REST API toolset),
 * or a catalog id that is no longer listed. The row status and the details
 * popup share this so they cannot disagree. Readiness of the catalog is the
 * caller's concern: before it loads, a missing entity says nothing.
 */
export const getAddOnResolution = (
  entity: AddOnEntity | undefined,
  id: string,
): AddOnResolution => {
  if (entity != null) return AddOnResolution.Catalog;
  return isApplicationId(id) || isToolsetId(id) ? AddOnResolution.NotFound : AddOnResolution.Inline;
};
