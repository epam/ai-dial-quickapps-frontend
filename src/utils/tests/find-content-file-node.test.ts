import { CatalogContentNodeType, type CatalogContentTreeNode } from '@epam/ai-dial-catalog';
import { describe, expect, it } from 'vitest';

import { findContentFileNode } from '@/utils/find-content-file-node';

const TREE: CatalogContentTreeNode[] = [
  { type: CatalogContentNodeType.File, id: 'SKILL.md', name: 'SKILL.md' },
  {
    type: CatalogContentNodeType.Folder,
    id: 'docs',
    name: 'docs',
    items: [
      {
        type: CatalogContentNodeType.Folder,
        id: 'docs/data',
        name: 'data',
        items: [
          { type: CatalogContentNodeType.File, id: 'docs/data/people.csv', name: 'people.csv' },
        ],
      },
    ],
  },
];

describe('findContentFileNode', () => {
  it('finds a top-level file', () => {
    expect(findContentFileNode(TREE, 'SKILL.md')?.name).toBe('SKILL.md');
  });

  it('finds a file nested in folders', () => {
    expect(findContentFileNode(TREE, 'docs/data/people.csv')?.name).toBe('people.csv');
  });

  it('finds nothing for a folder id', () => {
    expect(findContentFileNode(TREE, 'docs/data')).toBeUndefined();
  });

  it('finds nothing for an unknown id or a missing tree', () => {
    expect(findContentFileNode(TREE, 'missing.md')).toBeUndefined();
    expect(findContentFileNode(undefined, 'SKILL.md')).toBeUndefined();
  });
});
