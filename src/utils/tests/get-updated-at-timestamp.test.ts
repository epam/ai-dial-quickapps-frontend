import { describe, expect, it } from 'vitest';

import { getUpdatedAtTimestamp } from '@/utils/get-updated-at-timestamp';

describe('getUpdatedAtTimestamp', () => {
  it.each([undefined, 'not-a-date'])('returns zero for a missing or invalid value: %s', (value) => {
    expect(getUpdatedAtTimestamp(value)).toBe(0);
  });

  it('normalizes an ISO date string', () => {
    const value = '2026-01-02T03:04:05.000Z';

    expect(getUpdatedAtTimestamp(value)).toBe(Date.parse(value));
  });

  it('preserves an epoch-millisecond value', () => {
    const value = 1767323045000;

    expect(getUpdatedAtTimestamp(value)).toBe(value);
  });
});
