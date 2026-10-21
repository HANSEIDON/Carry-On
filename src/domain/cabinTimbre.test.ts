import { describe, expect, it } from 'vitest';
import { timbreFor } from './cabinTimbre';

describe('timbreFor', () => {
  it('gives wide-bodies the 777 cabin', () => {
    expect(timbreFor('widebody', 'HL 474')).toBe('b777');
    expect(timbreFor('longhaul', 'HL 474')).toBe('b777');
  });

  it('gives narrow-bodies an A320 or 737 cabin, the same every time for a flight', () => {
    const t = timbreFor('narrowbody', 'HL 474');
    expect(['a320', 'b737']).toContain(t);
    expect(timbreFor('narrowbody', 'HL 474')).toBe(t);
  });

  it('uses both narrow-body cabins across flights', () => {
    const seen = new Set(Array.from({ length: 20 }, (_, i) => timbreFor('narrowbody', `HL ${100 + i}`)));
    expect(seen).toEqual(new Set(['a320', 'b737']));
  });
});
