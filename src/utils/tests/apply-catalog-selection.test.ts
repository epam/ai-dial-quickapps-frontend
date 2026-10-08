import { describe, expect, it } from 'vitest';

import { applyCatalogSelection } from '@/utils/apply-catalog-selection';

const LISTED = new Set(['a', 'b', 'c', 'd']);

describe('applyCatalogSelection', () => {
  it('keeps still-checked attached ids first and appends new ones in check order', () => {
    expect(applyCatalogSelection(['a', 'b'], new Set(['b', 'd', 'c']), LISTED)).toEqual([
      'b',
      'd',
      'c',
    ]);
  });

  it('keeps an attached id that has no catalog row in its position', () => {
    expect(applyCatalogSelection(['a', 'gone', 'b'], new Set(['a', 'b']), LISTED)).toEqual([
      'a',
      'gone',
      'b',
    ]);
  });

  it('keeps the attached order when an id is unchecked and checked again', () => {
    expect(applyCatalogSelection(['a', 'b'], new Set(['b', 'a']), LISTED)).toEqual(['a', 'b']);
  });

  it('removes every listed id when nothing is checked', () => {
    expect(applyCatalogSelection(['a', 'b'], new Set(), LISTED)).toEqual([]);
  });

  it("keeps another row's ids, which the picker does not list, in their positions", () => {
    expect(
      applyCatalogSelection(['agent-1', 'a', 'agent-2', 'b'], new Set(['b', 'c']), LISTED),
    ).toEqual(['agent-1', 'agent-2', 'b', 'c']);
  });
});
