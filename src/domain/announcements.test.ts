import { describe, expect, it } from 'vitest';
import { arrival, cruise, descent, spokenDuration, spokenFlight, welcome, type AnnouncementContext } from './announcements';

const ctx: AnnouncementContext = {
  airline: 'Hanul Air',
  flightNumber: 'HL 474',
  fromCity: 'Seoul',
  toCity: 'Tokyo',
  scenic: false,
  minutes: 120,
  altitudeFt: 35_000,
  localTime: '12:18',
};

describe('spoken helpers', () => {
  it('reads durations in words', () => {
    expect(spokenDuration(100)).toBe('one hour and forty minutes');
    expect(spokenDuration(120)).toBe('two hours');
    expect(spokenDuration(45)).toBe('forty-five minutes');
    expect(spokenDuration(695)).toBe('eleven hours and thirty-five minutes');
  });

  it('reads flight numbers digit by digit', () => {
    expect(spokenFlight('HL 474')).toBe('flight four seven four');
  });
});

describe('scripts', () => {
  it('welcomes passengers to the destination', () => {
    const text = welcome(ctx);
    expect(text).toContain('welcome aboard Hanul Air, flight four seven four to Tokyo');
    expect(text).toContain('two hours');
  });

  it('names the scenic city for scenic flights', () => {
    expect(welcome({ ...ctx, scenic: true })).toContain('scenic flight over Seoul');
    expect(descent({ ...ctx, scenic: true })).toContain('descent into Seoul');
  });

  it('announces cruise altitude, descent and arrival', () => {
    expect(cruise(ctx)).toContain('35,000 feet');
    expect(descent(ctx)).toContain('descent into Tokyo');
    expect(arrival(ctx)).toContain('welcome to Tokyo. The local time is 12:18.');
  });
});
