import { describe, expect, it } from 'vitest';
import { cityByCode } from '../data/cities';
import { planRoute, planScenic } from './flightPlan';
import { earnedMiles, formatClock, HANDLING_CHANCE, progress, remainingMs, stickersForLanding } from './landing';
import { autoAssign, buildSeatMap, cabinUnlocked, canPick } from './seatmap';

const ICN = cityByCode('ICN')!;
const PEK = cityByCode('PEK')!;
const LHR = cityByCode('LHR')!;

describe('planRoute', () => {
  it('uses the departure country airline and a stable flight number', () => {
    const a = planRoute(ICN, PEK);
    const b = planRoute(ICN, PEK);
    expect(a.airline.name).toBe('Hanul Air');
    expect(a.flightNumber).toMatch(/^HL \d{3}$/);
    expect(a.flightNumber).toBe(b.flightNumber);
    expect(a.gate).toMatch(/^[A-E]\d{1,2}$/);
    expect(a.minutes).toBe(100);
  });

  it('flies scenic loops back to the origin with the house airline', () => {
    const s = planScenic(ICN, 25);
    expect(s.toCode).toBe('ICN');
    expect(s.scenic).toBe(true);
    expect(s.airline.code).toBe('CO');
    expect(s.miles).toBe(125);
  });
});

describe('buildSeatMap', () => {
  it('is deterministic for the same seed', () => {
    const a = buildSeatMap('narrowbody', 42).seats.map((s) => s.occupied);
    const b = buildSeatMap('narrowbody', 42).seats.map((s) => s.occupied);
    expect(a).toEqual(b);
  });

  it('marks windows, aisles and zones', () => {
    const map = buildSeatMap('narrowbody', 1);
    const seat = (id: string) => map.seats.find((s) => s.id === id)!;
    expect(seat('20A').window).toBe(true);
    expect(seat('20C').aisle).toBe(true);
    expect(seat('20B').window || seat('20B').aisle).toBe(false);
    expect(seat('1A').zone).toBe('front');
    expect(seat('32F').zone).toBe('rear');
    expect(map.wingRows.length).toBeGreaterThan(0);
  });

  it('gives long-haul aircraft a first class cabin', () => {
    const plan = planRoute(ICN, LHR);
    expect(plan.aircraft).toBe('longhaul');
    const map = buildSeatMap(plan.aircraft, 7);
    expect(map.seats.some((s) => s.cabin === 'first')).toBe(true);
  });
});

describe('seat rules', () => {
  it('locks premium cabins by tier', () => {
    expect(cabinUnlocked('economy', 'basic')).toBe(true);
    expect(cabinUnlocked('business', 'basic')).toBe(false);
    expect(cabinUnlocked('business', 'silver')).toBe(true);
    expect(cabinUnlocked('first', 'gold')).toBe(false);
    expect(cabinUnlocked('first', 'platinum')).toBe(true);
  });

  it('auto-assigns a free seat the tier may use, preferring windows', () => {
    const map = buildSeatMap('widebody', 3);
    const seat = autoAssign(map, 'basic', () => 0)!;
    expect(seat.cabin).toBe('economy');
    expect(canPick(seat, 'basic')).toBe(true);
    expect(seat.window).toBe(true);
  });
});

describe('landing', () => {
  it('adds the tier mile bonus', () => {
    expect(earnedMiles(560, 'basic')).toBe(560);
    expect(earnedMiles(560, 'gold')).toBe(616);
    expect(earnedMiles(560, 'platinum')).toBe(700);
  });

  it('adds a priority sticker for premium cabins or high tiers', () => {
    expect(stickersForLanding('economy', 'basic')).toEqual(['bag_tag']);
    expect(stickersForLanding('business', 'silver')).toEqual(['bag_tag', 'priority']);
    expect(stickersForLanding('economy', 'gold')).toEqual(['bag_tag', 'priority']);
  });

  it('now and then adds a handling sticker, fixed per flight', () => {
    const extras = Array.from({ length: 400 }, (_, i) => stickersForLanding('economy', 'basic', { id: `f${i}`, minutes: 400 }));
    expect(extras[7]).toEqual(stickersForLanding('economy', 'basic', { id: 'f7', minutes: 400 }));
    const share = extras.filter((k) => k.length > 1).length / extras.length;
    expect(share).toBeGreaterThan(HANDLING_CHANCE - 0.08);
    expect(share).toBeLessThan(HANDLING_CHANCE + 0.08);
    expect(new Set(extras.flatMap((k) => k.slice(1)))).toEqual(new Set(['fragile', 'security', 'heavy', 'transfer']));
    // Short hops never get heavy or transfer.
    const short = Array.from({ length: 200 }, (_, i) => stickersForLanding('economy', 'basic', { id: `s${i}`, minutes: 45 })).flat();
    expect(short).not.toContain('heavy');
    expect(short).not.toContain('transfer');
  });
});

describe('flight clock', () => {
  const start = 1_000_000;

  it('counts down and clamps at zero', () => {
    expect(remainingMs(start, 10, start)).toBe(600_000);
    expect(remainingMs(start, 10, start + 60_000)).toBe(540_000);
    expect(remainingMs(start, 10, start + 3_600_000)).toBe(0);
  });

  it('speeds up with a time scale (dev testing)', () => {
    expect(remainingMs(start, 10, start + 1_000, 60)).toBe(540_000);
  });

  it('reports progress from 0 to 1', () => {
    expect(progress(start, 10, start)).toBe(0);
    expect(progress(start, 10, start + 300_000)).toBeCloseTo(0.5);
    expect(progress(start, 10, start + 999_999)).toBe(1);
  });

  it('formats the countdown', () => {
    expect(formatClock(247_000)).toBe('4:07');
    expect(formatClock(3_909_000)).toBe('1:05:09');
    expect(formatClock(0)).toBe('0:00');
  });
});
