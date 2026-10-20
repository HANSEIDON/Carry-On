import type { Tier } from './types';

/** Lifetime miles needed for each tier (draft balance, see docs/SPEC.md §8). */
export const TIER_THRESHOLDS: Record<Tier, number> = {
  basic: 0,
  silver: 10_000,
  gold: 50_000,
  platinum: 150_000,
};

export const TIER_MILE_BONUS: Record<Tier, number> = {
  basic: 0,
  silver: 0,
  gold: 0.1,
  platinum: 0.25,
};

const ORDER: Tier[] = ['basic', 'silver', 'gold', 'platinum'];

export function tierFor(lifetimeMiles: number): Tier {
  let tier: Tier = 'basic';
  for (const t of ORDER) {
    if (lifetimeMiles >= TIER_THRESHOLDS[t]) tier = t;
  }
  return tier;
}

/** Next tier and how many lifetime miles remain, or null at the top tier. */
export function nextTier(lifetimeMiles: number): { tier: Tier; remaining: number } | null {
  const next = ORDER[ORDER.indexOf(tierFor(lifetimeMiles)) + 1];
  if (!next) return null;
  return { tier: next, remaining: TIER_THRESHOLDS[next] - lifetimeMiles };
}

export function tierLabel(tier: Tier): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}
