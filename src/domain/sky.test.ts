import { describe, expect, it } from 'vitest';
import { flightState, phaseBounds } from './flightProfile';
import { centralAngle, isNight, subsolarPoint } from './sun';

describe('subsolarPoint', () => {
  it('sits on the equator at the March equinox', () => {
    expect(Math.abs(subsolarPoint(new Date('2026-03-20T14:46:00Z')).lat)).toBeLessThan(0.3);
  });

  it('reaches the Tropic of Cancer at the June solstice', () => {
    expect(subsolarPoint(new Date('2026-06-21T08:24:00Z')).lat).toBeCloseTo(23.44, 0);
  });

  it('is near the Greenwich meridian at noon UTC (within the equation of time)', () => {
    expect(Math.abs(subsolarPoint(new Date('2026-10-20T12:00:00Z')).lon)).toBeLessThan(5);
  });

  it('moves west 15° per hour', () => {
    const a = subsolarPoint(new Date('2026-10-20T12:00:00Z')).lon;
    const b = subsolarPoint(new Date('2026-10-20T13:00:00Z')).lon;
    expect(a - b).toBeCloseTo(15, 0);
  });
});

describe('isNight', () => {
  const seoul = { lat: 37.46, lon: 126.44 };

  it('is day in Seoul at local noon and night at local midnight', () => {
    expect(isNight(seoul, new Date('2026-10-20T03:00:00Z'))).toBe(false); // 12:00 KST
    expect(isNight(seoul, new Date('2026-10-20T15:00:00Z'))).toBe(true); // 00:00 KST
  });

  it('measures central angles', () => {
    expect(centralAngle({ lat: 0, lon: 0 }, { lat: 0, lon: 90 })).toBeCloseTo(90);
    expect(centralAngle(seoul, seoul)).toBeCloseTo(0);
  });
});

describe('flightState', () => {
  it('climbs, cruises and descends', () => {
    expect(flightState(0, 100, 'narrowbody').altitudeFt).toBe(0);
    expect(flightState(0.1, 100, 'narrowbody').phase).toBe('climb');
    const cruise = flightState(0.5, 100, 'narrowbody');
    expect(cruise.phase).toBe('cruise');
    expect(cruise.altitudeFt).toBe(35_000);
    expect(cruise.outsideTempC).toBe(-54);
    expect(flightState(0.9, 100, 'narrowbody').phase).toBe('descent');
    expect(flightState(1, 100, 'narrowbody').altitudeFt).toBe(0);
  });

  it('keeps short flights mostly cruising', () => {
    const { climbEnd, descentStart } = phaseBounds(45);
    expect(climbEnd).toBeCloseTo(0.3);
    expect(descentStart).toBeCloseTo(0.65);
  });

  it('caps climb and descent on long flights', () => {
    const { climbEnd, descentStart } = phaseBounds(600);
    expect(climbEnd * 600).toBeCloseTo(20);
    expect((1 - descentStart) * 600).toBeCloseTo(25);
  });

  it('flies scenic loops low and slow', () => {
    const s = flightState(0.5, 25, 'narrowbody', true);
    expect(s.altitudeFt).toBe(6_000);
    expect(s.groundSpeedKmh).toBe(320);
  });
});
