import { describe, expect, it } from 'vitest';
import { cityByCode, CITIES } from '../data/cities';
import { aircraftFor, distanceKm, flightMinutes, formatDuration, milesFor } from './geo';

const city = (code: string) => {
  const c = cityByCode(code);
  if (!c) throw new Error(`missing city ${code}`);
  return c;
};

describe('distanceKm', () => {
  it('matches known great-circle distances within 2%', () => {
    // Reference values: great-circle airport-to-airport distances.
    const cases: [string, string, number][] = [
      ['ICN', 'PEK', 915],
      ['ICN', 'HND', 1215],
      ['ICN', 'LHR', 8860],
      ['JFK', 'LHR', 5540],
    ];
    for (const [a, b, km] of cases) {
      expect(distanceKm(city(a), city(b))).toBeGreaterThan(km * 0.98);
      expect(distanceKm(city(a), city(b))).toBeLessThan(km * 1.02);
    }
  });

  it('is symmetric and zero for the same point', () => {
    expect(distanceKm(city('ICN'), city('PEK'))).toBeCloseTo(distanceKm(city('PEK'), city('ICN')), 6);
    expect(distanceKm(city('ICN'), city('ICN'))).toBe(0);
  });
});

describe('flightMinutes', () => {
  it('adds ground time and rounds to 5 minutes', () => {
    expect(flightMinutes(0)).toBe(30);
    expect(flightMinutes(800)).toBe(90);
    expect(flightMinutes(915)).toBe(100);
  });

  it('gives Seoul–Beijing about 1h 40m', () => {
    expect(flightMinutes(distanceKm(city('ICN'), city('PEK')))).toBe(100);
  });

  it('always returns a multiple of 5', () => {
    for (const a of CITIES) {
      expect(flightMinutes(distanceKm(city('ICN'), a)) % 5).toBe(0);
    }
  });
});

describe('helpers', () => {
  it('converts km to miles', () => {
    expect(milesFor(1000)).toBe(621);
  });

  it('picks aircraft by distance', () => {
    expect(aircraftFor(900)).toBe('narrowbody');
    expect(aircraftFor(4000)).toBe('widebody');
    expect(aircraftFor(9000)).toBe('longhaul');
  });

  it('formats durations', () => {
    expect(formatDuration(45)).toBe('45m');
    expect(formatDuration(100)).toBe('1h 40m');
    expect(formatDuration(120)).toBe('2h');
  });
});

describe('city data', () => {
  it('has unique 3-letter codes and valid coordinates', () => {
    const codes = new Set<string>();
    for (const c of CITIES) {
      expect(c.code).toMatch(/^[A-Z]{3}$/);
      expect(codes.has(c.code)).toBe(false);
      codes.add(c.code);
      expect(Math.abs(c.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(c.lon)).toBeLessThanOrEqual(180);
    }
  });

  it('uses time zones the runtime understands', () => {
    for (const c of CITIES) {
      expect(() => new Intl.DateTimeFormat('en', { timeZone: c.tz })).not.toThrow();
    }
  });
});
