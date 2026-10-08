import { describe, expect, it } from 'vitest';

import { snapToStep } from '@/utils/snap-to-step';

describe('snapToStep', () => {
  it('snaps to the nearest step without float noise', () => {
    expect(snapToStep(0.34, 0, 1, 0.1)).toBe(0.3);
    expect(snapToStep(0.35, 0, 1, 0.1)).toBe(0.4);
    expect(snapToStep(0.1 + 0.2, 0, 1, 0.1)).toBe(0.3);
  });

  it('clamps into the range', () => {
    expect(snapToStep(-2, 0, 1, 0.1)).toBe(0);
    expect(snapToStep(7, 0, 1, 0.1)).toBe(1);
  });

  it('only clamps for a non-positive step', () => {
    expect(snapToStep(0.37, 0, 1, 0)).toBe(0.37);
  });
});
