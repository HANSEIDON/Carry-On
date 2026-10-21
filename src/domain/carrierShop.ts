import type { CarrierType } from '../data/carriers';
import type { Tier } from './types';

/** Where a carrier stands for you in Duty Free. */
export type ShopState =
  | { kind: 'owned' }
  /** Not made yet (no 3D model). */
  | { kind: 'soon' }
  /** Needs a higher membership tier. */
  | { kind: 'locked'; tier: Tier }
  /** Allowed, but not enough miles yet. */
  | { kind: 'short'; missing: number }
  | { kind: 'buyable' };

const RANK: Record<Tier, number> = { basic: 0, silver: 1, gold: 2, platinum: 3 };

export function tierAllows(member: Tier, needed: Tier): boolean {
  return RANK[member] >= RANK[needed];
}

export function shopState(type: CarrierType, you: { owned: boolean; tier: Tier; miles: number }): ShopState {
  if (you.owned) return { kind: 'owned' };
  if (!type.model) return { kind: 'soon' };
  if (!tierAllows(you.tier, type.tier)) return { kind: 'locked', tier: type.tier };
  if (you.miles < type.price) return { kind: 'short', missing: type.price - you.miles };
  return { kind: 'buyable' };
}

/**
 * Filling a carrier (a sticker on every spot) pays miles back: this much per spot, so a big trunk
 * pays more than a little robot but never more per flight. Doubled the first time you fill that
 * kind, like a first-clear reward. On a basic member's flights (~400 mi, one sticker) that's about
 * a tenth of what the flights earned, a fifth the first time; gold and platinum members get two
 * stickers a flight, so their carriers fill (and pay) twice as fast. The starter shell's first
 * fill comes to about the price of a basic carrier.
 */
export const FILL_MILES_PER_SPOT = 40;

export function fillReward(capacity: number, firstTime: boolean): number {
  return capacity * FILL_MILES_PER_SPOT * (firstTime ? 2 : 1);
}

/** Shop order: what you can reach first (tier, then price), then by number. */
export function shopOrder(a: CarrierType, b: CarrierType): number {
  return RANK[a.tier] - RANK[b.tier] || a.price - b.price || a.id.localeCompare(b.id);
}
