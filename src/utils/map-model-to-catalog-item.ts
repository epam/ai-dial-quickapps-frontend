import type { CatalogItem } from '@epam/ai-dial-catalog';
import { CatalogEntityType } from '@epam/ai-dial-chat-shared';

import { MODEL_ROOTS } from '@/constants/dial-paths';
import type { DialModel } from '@/types/dial-entities';
import { type EntityScopeInfo, ResourceScope } from '@/types/resource-scope';
import { getCatalogFolder, getEntityScopeInfo } from '@/utils/entity-scope';
import { getLocalizedText } from '@/utils/get-localized-text';
import { getUpdatedAtTimestamp } from '@/utils/get-updated-at-timestamp';
import { resolveIconUrl } from '@/utils/resolve-icon-url';

interface MapModelToCatalogItemOptions {
  language: string;
  userBucket?: string;
  /** Already-translated scope labels — keeps this util free of i18n. */
  scopeLabels: Record<ResourceScope, string>;
}

/**
 * Configured models have no bucket segment — chat-api returns them as a bare
 * deployment id (`gpt-4o`) or under a model root (`models/gpt-4o`) — so
 * `getEntityScopeInfo` can't classify them; they are deployed by admins for
 * everyone, which is what Organization means — the same way the DIAL chat
 * catalog files configured applications under its public folder.
 */
const getModelScopeInfo = (id: string, userBucket?: string): EntityScopeInfo | undefined => {
  const scopeInfo = getEntityScopeInfo(id, userBucket);
  if (scopeInfo != null) return scopeInfo;

  const parts = id.split('/');
  const isConfiguredModel = parts.length === 1 || (parts.length === 2 && MODEL_ROOTS.has(parts[0]));
  return isConfiguredModel ? { scope: ResourceScope.Organization, folderPath: [] } : undefined;
};

/**
 * Maps a DIAL model deployment to a catalog list row. The full versioned id is
 * kept, so every version of an entity becomes its own row. `folder` is the
 * scope label followed by the folder path (e.g. `['Organization', 'folder1']`)
 * and is empty when the scope cannot be determined.
 */
export const mapModelToCatalogItem = (
  model: DialModel,
  { language, userBucket, scopeLabels }: MapModelToCatalogItemOptions,
): CatalogItem => {
  const scopeInfo = getModelScopeInfo(model.id, userBucket);
  const updatedAt = getUpdatedAtTimestamp(model.updatedAt);

  return {
    id: model.id,
    type: CatalogEntityType.Model,
    name: getLocalizedText(model.name, language, model.id),
    version: model.version ?? '',
    iconUrl: model.iconUrl ? resolveIconUrl(model.iconUrl) : undefined,
    description: model.description ?? '',
    topics: model.topics ?? [],
    updatedAt: updatedAt > 0 ? updatedAt : undefined,
    folder: getCatalogFolder(scopeInfo, scopeLabels),
    isMyApp: scopeInfo?.scope === ResourceScope.Personal,
    // Required by `CatalogItem`, never shown in the list view.
    lastUsed: '',
  };
};
