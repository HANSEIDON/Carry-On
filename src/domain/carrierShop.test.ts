import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CARRIERS, carrierType, STARTER_CARRIER_ID, TIER_PRICE } from '../data/carriers';
import { FILL_MILES_PER_SPOT, fillReward, shopOrder, shopState, tierAllows } from './carrierShop';

describe('carrier catalog', () => {
  it('has thirty carriers numbered 001 to 030', () => {
    expect(CARRIERS).toHaveLength(30);
    expect(CARRIERS.map((c) => c.id)).toEqual(Array.from({ length: 30 }, (_, i) => String(i + 1).padStart(3, '0')));
  });

  it('has a model file for every carrier marked as made, and the starter is one of them', () => {
    for (const c of CARRIERS.filter((c) => c.model)) {
      expect(existsSync(`public/models/carriers/${c.id}.glb`), c.id).toBe(true);
      // Its card picture too (bake with ?bake-carriers), and how to stand it up.
      expect(existsSync(`public/models/carriers/thumbs/${c.id}.webp`), `${c.id} thumb`).toBe(true);
      expect(c.orient, `${c.id} orient`).toHaveLength(3);
    }
    expect(carrierType(STARTER_CARRIER_ID)).toMatchObject({ model: true, price: 0, tier: 'basic' });
  });

  it('prices by tier', () => {
    expect(carrierType('003').price).toBe(TIER_PRICE.silver);
    expect(carrierType('999').id).toBe(STARTER_CARRIER_ID);
  });
});

describe('duty free', () => {
  const leather = carrierType('003'); // silver
  it('needs the tier first, then the miles', () => {
    expect(shopState(leather, { owned: false, tier: 'basic', miles: 99_999 })).toEqual({ kind: 'locked', tier: 'silver' });
    expect(shopState(leather, { owned: false, tier: 'silver', miles: 1_000 })).toEqual({ kind: 'short', missing: 5_000 });
    expect(shopState(leather, { owned: false, tier: 'gold', miles: 6_000 })).toEqual({ kind: 'buyable' });
    expect(shopState(leather, { owned: true, tier: 'basic', miles: 0 })).toEqual({ kind: 'owned' });
  });

  it('does not sell carriers that are not made yet', () => {
    expect(shopState(carrierType('004'), { owned: false, tier: 'platinum', miles: 99_999 })).toEqual({ kind: 'soon' });
  });

  it('ranks tiers and lists the reachable ones first', () => {
    expect(tierAllows('gold', 'silver')).toBe(true);
    expect(tierAllows('silver', 'gold')).toBe(false);
    const sorted = [...CARRIERS].sort(shopOrder).map((c) => c.tier);
    expect(sorted.indexOf('platinum')).toBeGreaterThan(sorted.lastIndexOf('basic'));
  });
});

describe('filling a carrier', () => {
  it('pays per sticker spot, doubled the first time', () => {
    expect(fillReward(30, false)).toBe(30 * FILL_MILES_PER_SPOT);
    expect(fillReward(30, true)).toBe(2 * 30 * FILL_MILES_PER_SPOT);
  });

  it('gives every carrier with a model some spots, and none too many', () => {
    for (const c of CARRIERS.filter((c) => c.model)) {
      expect(c.capacity, c.id).toBeGreaterThanOrEqual(6);
      expect(c.capacity, c.id).toBeLessThanOrEqual(40);
      expect(c.slots, c.id).toHaveLength(c.capacity);
    }
  });

  it("pays the starter's first fill about the price of a basic carrier", () => {
    const starter = carrierType(STARTER_CARRIER_ID);
    expect(fillReward(starter.capacity, true) / TIER_PRICE.basic).toBeGreaterThan(0.7);
    expect(fillReward(starter.capacity, true) / TIER_PRICE.basic).toBeLessThan(1.3);
  });
});
