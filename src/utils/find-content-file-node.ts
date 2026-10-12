import {
  type CatalogContentFileNode,
  CatalogContentNodeType,
  type CatalogContentTreeNode,
} from '@epam/ai-dial-catalog';

/**
 * Finds the file node with `fileId` anywhere in a catalog Content tab file
 * tree. A folder id, or an id not in the tree, finds nothing.
 */
export const findContentFileNode = (
  nodes: CatalogContentTreeNode[] | undefined,
  fileId: string,
): CatalogContentFileNode | undefined => {
  for (const node of nodes ?? []) {
    if (node.type === CatalogContentNodeType.File) {
      if (node.id === fileId) return node;
    } else {
      const found = findContentFileNode(node.items, fileId);
      if (found != null) return found;
    }
  }
  return undefined;
};
