import { describe, expect, it } from 'vitest';
import { CITIES, cityByCode } from '../data/cities';
import { routesFrom, routesNearDuration, scenicMiles, surpriseRoute, toleranceFor } from './booking';
import { seededRandom } from './random';

const seoul = cityByCode('ICN')!;

describe('routesFrom', () => {
  it('lists every other city, shortest first', () => {
    const routes = routesFrom(seoul, CITIES);
    expect(routes).toHaveLength(CITIES.length - 1);
    expect(routes.some((r) => r.to.code === 'ICN')).toBe(false);
    for (let i = 1; i < routes.length; i++) {
      expect(routes[i].minutes).toBeGreaterThanOrEqual(routes[i - 1].minutes);
    }
  });
});

describe('routesNearDuration', () => {
  it('finds Beijing for a 1h 40m session from Seoul', () => {
    const codes = routesNearDuration(seoul, CITIES, 100).map((r) => r.to.code);
    expect(codes).toContain('PEK');
  });

  it('only returns routes within tolerance, closest first', () => {
    const target = 240;
    const routes = routesNearDuration(seoul, CITIES, target);
    const diffs = routes.map((r) => Math.abs(r.minutes - target));
    for (const d of diffs) expect(d).toBeLessThanOrEqual(toleranceFor(target));
    expect([...diffs].sort((a, b) => a - b)).toEqual(diffs);
  });

  it('uses at least ±10 minutes tolerance', () => {
    expect(toleranceFor(30)).toBe(10);
    expect(toleranceFor(300)).toBe(30);
  });
});

describe('scenic flights', () => {
  it('earns 5 miles per minute', () => {
    expect(scenicMiles(25)).toBe(125);
  });
});

describe('surpriseRoute', () => {
  it('finds a flight of about the chosen time from anywhere', () => {
    const rand = seededRandom(7);
    for (const minutes of [45, 60, 90, 120]) {
      const r = surpriseRoute(CITIES, minutes, rand)!;
      expect(Math.abs(r.minutes - minutes), `${minutes}`).toBeLessThanOrEqual(toleranceFor(minutes));
    }
  });

  it('reaches far more places than flying from home', () => {
    const rand = seededRandom(3);
    const seen = new Set(Array.from({ length: 200 }, () => surpriseRoute(CITIES, 90, rand)!.to.countryCode));
    const fromHome = new Set(routesNearDuration(seoul, CITIES, 90).map((r) => r.to.countryCode));
    expect(seen.size).toBeGreaterThan(fromHome.size * 3);
  });

  it('mostly picks countries not visited yet', () => {
    const rand = seededRandom(11);
    const visited = new Set(['JP', 'CN', 'KR']);
    const picks = Array.from({ length: 200 }, () => surpriseRoute(CITIES, 120, rand, visited)!);
    const fresh = picks.filter((r) => !visited.has(r.to.countryCode)).length / picks.length;
    expect(fresh).toBeGreaterThan(0.7);
  });
});
