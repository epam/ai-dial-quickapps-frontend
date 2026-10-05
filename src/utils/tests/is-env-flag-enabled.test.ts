import { describe, expect, it } from 'vitest';

import { isEnvFlagEnabled } from '@/utils/is-env-flag-enabled';

describe('isEnvFlagEnabled', () => {
  it.each([
    ['true', true],
    ['false', false],
    ['TRUE', false],
    [undefined, false],
  ])('returns %s for the %s environment value', (value, expected) => {
    expect(isEnvFlagEnabled(value)).toBe(expected);
  });
});
