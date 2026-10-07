import type { CatalogItem } from '@epam/ai-dial-catalog';
import { CatalogSortKey } from '@epam/ai-dial-catalog/mapping';
import { CatalogEntityType } from '@epam/ai-dial-chat-shared';
import { describe, expect, it } from 'vitest';

import {
  filterCatalogItemsByQuery,
  filterCatalogItemsByTopics,
} from '@/utils/filter-catalog-items';

const makeItem = (overrides: Partial<CatalogItem>): CatalogItem => ({
  id: 'models/item',
  type: CatalogEntityType.Model,
  name: 'Item',
  version: '',
  lastUsed: '',
  description: '',
  folder: [],
  topics: [],
  ...overrides,
});

const gemini = makeItem({ id: 'gemini', name: 'Gemini', topics: ['Business'], updatedAt: 100 });
const claude = makeItem({
  id: 'claude',
  name: 'Claude',
  topics: ['Code', 'Business'],
  updatedAt: 300,
  isMyApp: true,
});
const mistral = makeItem({ id: 'mistral', name: 'Mistral', topics: ['Research'] });

const ITEMS = [gemini, claude, mistral];

const NO_QUERY = {
  search: '',
  topics: new Set<string>(),
  isMyOnly: false,
  sortKey: CatalogSortKey.RecentlyUpdated,
};

const ids = (items: CatalogItem[]) => items.map((item) => item.id);

describe('filterCatalogItemsByTopics', () => {
  it('keeps every item when no topic is selected', () => {
    expect(filterCatalogItemsByTopics(ITEMS, new Set())).toBe(ITEMS);
  });

  it('keeps items with at least one selected topic', () => {
    expect(ids(filterCatalogItemsByTopics(ITEMS, new Set(['Code', 'Research'])))).toEqual([
      'claude',
      'mistral',
    ]);
  });
});

describe('filterCatalogItemsByQuery', () => {
  it('sorts by most recently updated, with items without a date last', () => {
    expect(ids(filterCatalogItemsByQuery(ITEMS, NO_QUERY))).toEqual([
      'claude',
      'gemini',
      'mistral',
    ]);
  });

  it('sorts by name', () => {
    expect(
      ids(filterCatalogItemsByQuery(ITEMS, { ...NO_QUERY, sortKey: CatalogSortKey.NameAZ })),
    ).toEqual(['claude', 'gemini', 'mistral']);
  });

  it('matches the name case-insensitively, ignoring surrounding spaces', () => {
    expect(ids(filterCatalogItemsByQuery(ITEMS, { ...NO_QUERY, search: '  MIS ' }))).toEqual([
      'mistral',
    ]);
  });

  it("keeps only the user's own items when isMyOnly is set", () => {
    expect(ids(filterCatalogItemsByQuery(ITEMS, { ...NO_QUERY, isMyOnly: true }))).toEqual([
      'claude',
    ]);
  });

  it('combines search, topics and ownership', () => {
    expect(
      ids(
        filterCatalogItemsByQuery(ITEMS, {
          ...NO_QUERY,
          search: 'i',
          topics: new Set(['Business']),
        }),
      ),
    ).toEqual(['gemini']);
    expect(
      ids(
        filterCatalogItemsByQuery(ITEMS, {
          ...NO_QUERY,
          topics: new Set(['Business']),
          isMyOnly: true,
        }),
      ),
    ).toEqual(['claude']);
  });
});
