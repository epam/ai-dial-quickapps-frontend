import { describe, expect, it } from 'vitest';

import { safeDecodeURI } from '@/utils/safe-decode-uri';

describe('safeDecodeURI', () => {
  it('decodes a valid encoded URI', () => {
    expect(safeDecodeURI('hello%20world')).toBe('hello world');
  });

  it('returns the original string when decoding fails', () => {
    expect(safeDecodeURI('100% off')).toBe('100% off');
  });
});
