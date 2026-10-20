import { describe, expect, it } from 'vitest';
import { nextTier, tierFor } from './tier';

describe('tierFor', () => {
  it('maps lifetime miles to tiers at the thresholds', () => {
    expect(tierFor(0)).toBe('basic');
    expect(tierFor(9_999)).toBe('basic');
    expect(tierFor(10_000)).toBe('silver');
    expect(tierFor(50_000)).toBe('gold');
    expect(tierFor(1_000_000)).toBe('platinum');
  });
});

describe('nextTier', () => {
  it('reports remaining miles to the next tier', () => {
    expect(nextTier(2_500)).toEqual({ tier: 'silver', remaining: 7_500 });
    expect(nextTier(150_000)).toBeNull();
  });
});
