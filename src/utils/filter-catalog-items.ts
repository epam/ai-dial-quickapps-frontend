import type { CatalogItem } from '@epam/ai-dial-catalog';
import { filterCatalogItems, sortCatalogItems } from '@epam/ai-dial-catalog/mapping';

export interface CatalogItemsQuery {
  /** Name search, case-insensitive and trimmed. */
  search: string;
  /** Topics to keep; empty keeps every item. */
  topics: Set<string>;
  /** Keep only the user's own items (`isMyApp`). */
  isMyOnly: boolean;
  /** A `CatalogSortKey` value. */
  sortKey: string;
}

/** Keeps items with at least one of `topics`; an empty set keeps every item. */
export const filterCatalogItemsByTopics = (
  items: CatalogItem[],
  topics: Set<string>,
): CatalogItem[] => {
  if (topics.size === 0) return items;
  return items.filter((item) => item.topics.some((topic) => topics.has(topic)));
};

/**
 * Applies a catalog toolbar's search, From filter (topics + "My") and sort, in
 * the same order and with the same semantics as the DIAL chat catalog. The
 * catalog package exports its search and sort helpers but not the topic and
 * "My" filters, so those two live here.
 */
export const filterCatalogItemsByQuery = (
  items: CatalogItem[],
  { search, topics, isMyOnly, sortKey }: CatalogItemsQuery,
): CatalogItem[] => {
  const searched = filterCatalogItems(items, search);
  const byTopics = filterCatalogItemsByTopics(searched, topics);
  const byOwner = isMyOnly ? byTopics.filter((item) => item.isMyApp === true) : byTopics;
  return sortCatalogItems(byOwner, sortKey);
};
