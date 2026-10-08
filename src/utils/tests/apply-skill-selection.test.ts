import { describe, expect, it } from 'vitest';

import { applySkillSelection } from '@/utils/apply-skill-selection';

const LISTED = new Set(['a', 'b', 'c', 'd']);

describe('applySkillSelection', () => {
  it('keeps still-checked attached skills first and appends new ones in check order', () => {
    expect(applySkillSelection(['a', 'b'], new Set(['b', 'd', 'c']), LISTED)).toEqual([
      'b',
      'd',
      'c',
    ]);
  });

  it('keeps an attached skill that has no catalog row in its position', () => {
    expect(applySkillSelection(['a', 'gone', 'b'], new Set(['a', 'b']), LISTED)).toEqual([
      'a',
      'gone',
      'b',
    ]);
  });

  it('keeps the attached order when a skill is unchecked and checked again', () => {
    expect(applySkillSelection(['a', 'b'], new Set(['b', 'a']), LISTED)).toEqual(['a', 'b']);
  });

  it('removes every listed skill when nothing is checked', () => {
    expect(applySkillSelection(['a', 'b'], new Set(), LISTED)).toEqual([]);
  });
});
