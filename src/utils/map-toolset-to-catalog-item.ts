import type { CatalogItem } from '@epam/ai-dial-catalog';
import {
  type CatalogItemCredentials,
  CredentialStatus,
  ToolsetAuthenticationType,
} from '@epam/ai-dial-catalog/mapping';
import { CatalogEntityType } from '@epam/ai-dial-chat-shared';

import { type DialToolset, ToolsetAuthStatus, ToolsetAuthType } from '@/types/dial-entities';
import { ResourceScope } from '@/types/resource-scope';
import { isPublicToolsetId } from '@/utils/api';
import { getCatalogFolder, getEntityScopeInfo } from '@/utils/entity-scope';
import { getLocalizedText } from '@/utils/get-localized-text';
import { getUpdatedAtTimestamp } from '@/utils/get-updated-at-timestamp';
import { resolveIconUrl } from '@/utils/resolve-icon-url';

export interface MapToolsetToCatalogItemOptions {
  language: string;
  userBucket?: string;
  /** Already-translated scope labels — keeps this util free of i18n. */
  scopeLabels: Record<ResourceScope, string>;
}

const AUTH_TYPE_MAP: Record<ToolsetAuthType, ToolsetAuthenticationType> = {
  [ToolsetAuthType.None]: ToolsetAuthenticationType.None,
  [ToolsetAuthType.ApiKey]: ToolsetAuthenticationType.ApiKey,
  [ToolsetAuthType.OAuth]: ToolsetAuthenticationType.OAuth,
};

const AUTH_STATUS_MAP: Record<ToolsetAuthStatus, CredentialStatus> = {
  [ToolsetAuthStatus.SignedIn]: CredentialStatus.SignedIn,
  [ToolsetAuthStatus.SignedOut]: CredentialStatus.SignedOut,
  [ToolsetAuthStatus.Failed]: CredentialStatus.Failed,
};

/**
 * A toolset's sign-in state in the catalog's shape, which draws the logged-out
 * badge. `authSettings.authStatus` is already the level that applies — the
 * user's own for public toolsets, the workspace's for private ones (see
 * `mapAuthSettings` in dial-client.ts) — so it fills only that level. A missing
 * status reads as signed out. Undefined when no authentication is needed.
 */
export const mapToolsetCredentials = (
  toolset: Pick<DialToolset, 'id' | 'authSettings'>,
): CatalogItemCredentials | undefined => {
  const authSettings = toolset.authSettings;
  if (authSettings == null || authSettings.authenticationType === ToolsetAuthType.None) {
    return undefined;
  }

  const isPublic = isPublicToolsetId(toolset.id);
  const status = AUTH_STATUS_MAP[authSettings.authStatus ?? ToolsetAuthStatus.SignedOut];
  return {
    authenticationType: AUTH_TYPE_MAP[authSettings.authenticationType],
    isPublic,
    ...(isPublic ? { userStatus: status } : { globalStatus: status }),
    apiKeyHeader: authSettings.apiKeyHeader,
  };
};

/**
 * Maps a toolset to a catalog list row. `folder` is the scope label followed
 * by the folder path and is empty when the scope cannot be determined.
 */
export const mapToolsetToCatalogItem = (
  toolset: DialToolset,
  { language, userBucket, scopeLabels }: MapToolsetToCatalogItemOptions,
): CatalogItem => {
  const scopeInfo = getEntityScopeInfo(toolset.id, userBucket);
  const updatedAt = getUpdatedAtTimestamp(toolset.updatedAt);

  return {
    id: toolset.id,
    type: CatalogEntityType.Toolset,
    name: getLocalizedText(toolset.name, language, toolset.id),
    version: toolset.version ?? '',
    iconUrl: toolset.iconUrl ? resolveIconUrl(toolset.iconUrl) : undefined,
    description: toolset.description ?? '',
    topics: toolset.topics ?? [],
    updatedAt: updatedAt > 0 ? updatedAt : undefined,
    folder: getCatalogFolder(scopeInfo, scopeLabels),
    isMyApp: scopeInfo?.scope === ResourceScope.Personal,
    credentials: mapToolsetCredentials(toolset),
    // Required by `CatalogItem`, never shown in the list view.
    lastUsed: '',
  };
};
