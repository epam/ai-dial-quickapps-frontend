import { CatalogEntityType } from '@epam/ai-dial-chat-shared';
import { describe, expect, it } from 'vitest';

import type { DialSkill } from '@/types/dial-entities';
import { ResourceScope } from '@/types/resource-scope';
import { getSkillOverviewRows, mapSkillToCatalogItem } from '@/utils/map-skill-to-catalog-item';

const USER_BUCKET = 'user-bucket-123';

const OPTIONS = {
  userBucket: USER_BUCKET,
  scopeLabels: {
    [ResourceScope.Personal]: 'Personal',
    [ResourceScope.Shared]: 'Shared',
    [ResourceScope.Organization]: 'Organization',
  },
};

const LABELS = { author: 'Author', folder: 'Folder', updated: 'Updated', version: 'Version' };

const makeSkill = (overrides: Partial<DialSkill> = {}): DialSkill => ({
  id: 'skills/public/web-search',
  reference: 'skills/public/web-search',
  name: 'Web Search',
  type: 'skill',
  ...overrides,
});

describe('mapSkillToCatalogItem', () => {
  it('maps a public skill to an Organization catalog row', () => {
    const item = mapSkillToCatalogItem(
      makeSkill({ description: 'Searches the web', updatedAt: 1759795200000 }),
      OPTIONS,
    );

    expect(item).toMatchObject({
      id: 'skills/public/web-search',
      type: CatalogEntityType.Skill,
      name: 'Web Search',
      description: 'Searches the web',
      folder: ['Organization'],
      updatedAt: 1759795200000,
      isMyApp: false,
    });
  });

  it('keeps the folder segments after the scope label', () => {
    const item = mapSkillToCatalogItem(makeSkill({ id: 'skills/public/research/x' }), OPTIONS);

    expect(item.folder).toEqual(['Organization', 'research']);
  });

  it('marks a skill in the user bucket as the user’s own', () => {
    const item = mapSkillToCatalogItem(makeSkill({ id: `skills/${USER_BUCKET}/mine` }), OPTIONS);

    expect(item.folder).toEqual(['Personal']);
    expect(item.isMyApp).toBe(true);
  });

  it('prefers the listing’s isMy flag over the scope', () => {
    const item = mapSkillToCatalogItem(
      makeSkill({ isMy: false, id: `skills/${USER_BUCKET}/x` }),
      OPTIONS,
    );

    expect(item.isMyApp).toBe(false);
  });

  it('leaves the folder empty when the scope cannot be determined', () => {
    const item = mapSkillToCatalogItem(makeSkill({ id: 'skills/other-bucket/x' }), {
      ...OPTIONS,
      userBucket: undefined,
    });

    expect(item.folder).toEqual([]);
  });

  it('passes version and tags through, and defaults them when absent', () => {
    expect(
      mapSkillToCatalogItem(makeSkill({ version: '1.4.6', tags: ['Business'] }), OPTIONS),
    ).toMatchObject({ version: '1.4.6', topics: ['Business'] });
    expect(mapSkillToCatalogItem(makeSkill(), OPTIONS)).toMatchObject({
      version: '',
      topics: [],
      description: '',
      updatedAt: undefined,
    });
  });
});

describe('getSkillOverviewRows', () => {
  it('lists author, folder, updated date and version', () => {
    const rows = getSkillOverviewRows(
      makeSkill({
        id: 'skills/public/research/user-research',
        author: 'jane.doe',
        updatedAt: Date.UTC(2025, 9, 7, 12),
        version: '1.4.6',
      }),
      { ...OPTIONS, language: 'en-US', labels: LABELS },
    );

    expect(rows).toEqual([
      { label: 'Author', value: 'jane.doe' },
      { label: 'Folder', value: 'Organization / research' },
      { label: 'Updated', value: 'Oct 7, 2025' },
      { label: 'Version', value: '1.4.6' },
    ]);
  });

  it('omits rows without a value', () => {
    const rows = getSkillOverviewRows(makeSkill({ id: 'skills/other-bucket/x' }), {
      ...OPTIONS,
      userBucket: undefined,
      language: 'en-US',
      labels: LABELS,
    });

    expect(rows).toEqual([]);
  });
});
