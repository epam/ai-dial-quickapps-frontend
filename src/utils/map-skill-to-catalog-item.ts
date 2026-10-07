import type { CatalogItem } from '@epam/ai-dial-catalog';
import { CatalogEntityType } from '@epam/ai-dial-chat-shared';

import type { DialSkill } from '@/types/dial-entities';
import { ResourceScope } from '@/types/resource-scope';
import { getCatalogFolder, getEntityScopeInfo } from '@/utils/entity-scope';
import { formatUpdatedAtDate, getUpdatedAtTimestamp } from '@/utils/get-updated-at-timestamp';

export interface MapSkillToCatalogItemOptions {
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

export interface SkillOverviewLabels {
  author: string;
  folder: string;
  updated: string;
  version: string;
}

export interface GetSkillOverviewRowsOptions extends MapSkillToCatalogItemOptions {
  language: string;
  labels: SkillOverviewLabels;
}

export interface SkillOverviewRow {
  label: string;
  value: string;
}

const FOLDER_SEPARATOR = ' / ';

/** Label/value rows of a skill's Overview tab; rows without a value are left out. */
export const getSkillOverviewRows = (
  skill: DialSkill,
  { userBucket, scopeLabels, language, labels }: GetSkillOverviewRowsOptions,
): SkillOverviewRow[] => {
  const folder = getCatalogFolder(getEntityScopeInfo(skill.id, userBucket), scopeLabels);
  const rows: SkillOverviewRow[] = [
    { label: labels.author, value: skill.author ?? '' },
    { label: labels.folder, value: folder.join(FOLDER_SEPARATOR) },
    { label: labels.updated, value: formatUpdatedAtDate(skill.updatedAt, language) },
    { label: labels.version, value: skill.version ?? '' },
  ];
  return rows.filter((row) => row.value !== '');
};
