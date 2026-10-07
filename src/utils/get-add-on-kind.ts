import { AddOnSchemaKeys, type AddOnEntry } from '@/form/quickApp2Form';
import { AddOnKind } from '@/types/add-on-kind';
import type { DialModel, DialToolset } from '@/types/dial-entities';
import { isApplicationId, isToolsetId } from '@/utils/api';
import { getLocalizedText } from '@/utils/get-localized-text';

export type AddOnEntity = DialModel | DialToolset;

export type AddOnEntityMap = Record<string, AddOnEntity | undefined>;

export type { AddOnEntry };

/**
 * Every entity an `addOns` entry can point at, keyed by id.
 * Existing apps may contain inline toolset configs with no `deployment_id`
 * (added via the removed JSON editor) — their entry id is the toolset `name`
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

/**
 * Which Add-ons row an entry belongs to. Mirrors the branches
 * `getQuickApp2Toolsets` uses to serialize it: models and applications are
 * agents; toolset entities, unresolved `toolsets/…` ids and inline toolset
 * configs (no `deployment_id`) are toolsets.
 */
export const getAddOnKind = (entry: AddOnEntry, entityMap: AddOnEntityMap): AddOnKind => {
  const id = entry[AddOnSchemaKeys.id];
  const entity = entityMap[id];

  if (entity) {
    return entity.type === 'model' || entity.type === 'application'
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
): AddOnIdsByKind =>
  entries.reduce<AddOnIdsByKind>(
    (acc, entry) => {
      const id = entry[AddOnSchemaKeys.id];
      if (getAddOnKind(entry, entityMap) === AddOnKind.Toolset) acc.toolsetIds.push(id);
      else acc.agentIds.push(id);
      return acc;
    },
    { toolsetIds: [], agentIds: [] },
  );
