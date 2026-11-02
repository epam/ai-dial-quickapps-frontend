import type { AddOnCatalogListProps } from '@epam/ai-dial-catalog';

// The editor has no favorites, so the add-on pickers drop the Favorite column.
export const ADD_ON_LIST_PROPS: AddOnCatalogListProps = {
  columnVisibility: { favorite: () => false },
};
