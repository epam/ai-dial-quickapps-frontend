import type { CatalogItem } from '@epam/ai-dial-catalog';
import {
  type SkillMetadataItemDto,
  SkillMetadataItemDtoNodeTypeEnum,
} from '@epam/ai-dial-chat-api-client';
import { CatalogEntityType } from '@epam/ai-dial-chat-shared';

import type { DialSkill } from '@/types/dial-entities';
import { ResourceScope } from '@/types/resource-scope';
import { getCatalogFolder, getEntityScopeInfo } from '@/utils/entity-scope';
import { getUpdatedAtTimestamp } from '@/utils/get-updated-at-timestamp';

interface MapSkillToCatalogItemOptions {
  userBucket?: string;
  /** Already-translated scope labels — keeps this util free of i18n. */
  scopeLabels: Record<ResourceScope, string>;
}

/**
 * Maps a skill to a catalog list row. `folder` is the scope label followed by
 * the folder path (e.g. `['Organization', 'research']`) and is empty when the
 * scope cannot be determined. Skills carry no icon, so the list falls back to
 * the name's initials.
 */
export const mapSkillToCatalogItem = (
  skill: DialSkill,
  { userBucket, scopeLabels }: MapSkillToCatalogItemOptions,
): CatalogItem => {
  const scopeInfo = getEntityScopeInfo(skill.id, userBucket);
  const updatedAt = getUpdatedAtTimestamp(skill.updatedAt);

  return {
    id: skill.id,
    type: CatalogEntityType.Skill,
    name: skill.name,
    version: skill.version ?? '',
    description: skill.description ?? '',
    topics: skill.tags ?? [],
    updatedAt: updatedAt > 0 ? updatedAt : undefined,
    folder: getCatalogFolder(scopeInfo, scopeLabels),
    isMyApp: skill.isMy ?? scopeInfo?.scope === ResourceScope.Personal,
    sharedWithMe: skill.sharedWithMe,
    // Required by `CatalogItem`, never shown in the list view.
    lastUsed: '',
  };
};

/**
 * A listed skill back in chat-api's listing shape — the fallback the catalog
 * skill-details hook reads the author and update time from when the skill's
 * own metadata request fails.
 */
export const mapSkillToMetadataDto = (skill: DialSkill): SkillMetadataItemDto => {
  const [, bucket = '', ...pathSegments] = skill.id.split('/');
  return {
    name: skill.name,
    url: skill.id,
    bucket: skill.bucket ?? bucket,
    path: skill.path ?? pathSegments.join('/'),
    nodeType: SkillMetadataItemDtoNodeTypeEnum.Item,
    author: skill.author,
    updatedAt: getUpdatedAtTimestamp(skill.updatedAt) || undefined,
    description: skill.description,
  };
};

