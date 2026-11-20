import { describe, expect, it } from 'vitest';

import { ATTACHMENT_TYPE_SUGGESTIONS } from '@/constants/attachment-types';

const GROUP_SUFFIX = '/*';

describe('ATTACHMENT_TYPE_SUGGESTIONS', () => {
  const groups = ATTACHMENT_TYPE_SUGGESTIONS.filter(({ value }) => value.endsWith(GROUP_SUFFIX));
  const types = ATTACHMENT_TYPE_SUGGESTIONS.filter(({ value }) => !value.endsWith(GROUP_SUFFIX));

  it('lists the image, text and application groups first, in that order', () => {
    expect(ATTACHMENT_TYPE_SUGGESTIONS.slice(0, groups.length)).toEqual(groups);
    expect(groups.map(({ label, value }) => [label, value])).toEqual([
      ['ANY-IMAGE', 'image/*'],
      ['ANY-TEXT', 'text/*'],
      ['ANY-APPLICATION', 'application/*'],
    ]);
  });

  it('shows the group itself as the description', () => {
    groups.forEach(({ value, description }) => expect(description).toBe(value));
  });

  it('only offers a group for a prefix that has several concrete types', () => {
    groups.forEach(({ value }) => {
      const prefix = value.slice(0, -GROUP_SUFFIX.length + 1);
      expect(types.filter((type) => type.value.startsWith(prefix)).length).toBeGreaterThan(1);
    });
  });

  it('has no duplicate values', () => {
    const values = ATTACHMENT_TYPE_SUGGESTIONS.map(({ value }) => value);
    expect(new Set(values).size).toBe(values.length);
  });
});
