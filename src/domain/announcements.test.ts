import { describe, expect, it } from 'vitest';
import {
  arrival,
  breakStart,
  cruise,
  descent,
  landing,
  partOfDay,
  seatbelt,
  spokenAbout,
  spokenAltitude,
  spokenDuration,
  spokenFlightNumber,
  spokenTime,
  takeoff,
  welcome,
  type AnnouncementContext,
} from './announcements';

const ctx: AnnouncementContext = {
  airline: 'Hanul Air',
  flightNumber: 'HL 474',
  fromCity: 'Seoul',
  toCity: 'Tokyo',
  scenic: false,
  minutes: 120,
  altitudeFt: 35_000,
  remainingMinutes: 88,
  local: { hour: 14, minute: 13 },
};

describe('spoken helpers', () => {
  it('reads durations in words', () => {
    expect(spokenDuration(100)).toBe('one hour and forty minutes');
    expect(spokenDuration(120)).toBe('two hours');
    expect(spokenDuration(45)).toBe('forty-five minutes');
    expect(spokenDuration(695)).toBe('eleven hours and thirty-five minutes');
  });

  it('rounds "about" times like a captain', () => {
    expect(spokenAbout(88)).toBe('one hour and thirty minutes');
    expect(spokenAbout(22)).toBe('twenty minutes');
    expect(spokenAbout(7)).toBe('seven minutes');
    expect(spokenAbout(0)).toBe('one minute');
    expect(spokenAbout(128)).toBe('two hours and fifteen minutes');
    expect(spokenAbout(442)).toBe('seven hours and fifteen minutes');
  });

  it('reads flight numbers digit by digit', () => {
    expect(spokenFlightNumber('HL 474')).toBe('four seven four');
  });

  it('reads altitudes in thousands', () => {
    expect(spokenAltitude(35_000)).toBe('thirty-five thousand');
    expect(spokenAltitude(6_000)).toBe('six thousand');
  });

  it('reads clock times the way announcements do', () => {
    expect(spokenTime(14, 13)).toBe('two thirteen p.m.');
    expect(spokenTime(9, 5)).toBe('nine oh five a.m.');
    expect(spokenTime(12, 0)).toBe('twelve p.m.');
    expect(spokenTime(0, 30)).toBe('twelve thirty a.m.');
  });

  it('greets by part of day', () => {
    expect(partOfDay(8)).toBe('morning');
    expect(partOfDay(14)).toBe('afternoon');
    expect(partOfDay(21)).toBe('evening');
    expect(partOfDay(2)).toBe('evening');
  });
});

describe('script', () => {
  it('has the crew welcome passengers with a gentle focus nudge', () => {
    const a = welcome(ctx);
    expect(a.speaker).toBe('crew');
    expect(a.chime).toBe('double');
    expect(a.text).toBe(
      'Ladies and gentlemen, welcome aboard Hanul Air, flight four seven four, to Tokyo. ' +
        'Our flight time today is two hours. Please fasten your seatbelt, and set your phone to flight mode.',
    );
  });

  it('has the captain call take-off and landing with a single chime', () => {
    expect(takeoff()).toMatchObject({ speaker: 'captain', chime: 'single', text: 'Cabin crew, please prepare for take-off.' });
    expect(landing()).toMatchObject({ speaker: 'captain', chime: 'single', text: 'Cabin crew, please take your seats for landing.' });
  });

  it('gives cruise altitude and arrival estimate from the flight deck', () => {
    const a = cruise(ctx);
    expect(a.speaker).toBe('captain');
    expect(a.text).toBe(
      "Good afternoon from the flight deck. We've reached our cruising altitude of thirty-five thousand feet, " +
        "and the seatbelt sign is now off. We'll have you in Tokyo, in about one hour and thirty minutes. " +
        'Sit back, and enjoy the quiet.',
    );
  });

  it('announces descent with time to landing', () => {
    expect(descent({ ...ctx, remainingMinutes: 22 }).text).toBe(
      "Ladies and gentlemen, we've begun our descent into Tokyo. We expect to land in about twenty minutes. " +
        'Please return to your seat and fasten your seatbelt.',
    );
  });

  it('welcomes passengers to the destination with the local time, to the nearest 5 minutes', () => {
    const a = arrival(ctx);
    expect(a.speaker).toBe('crew');
    expect(a.text).toBe('Ladies and gentlemen, welcome to Tokyo. The local time is two fifteen p.m. Thank you for flying Hanul Air.');
    expect(arrival({ ...ctx, local: { hour: 23, minute: 58 } }).text).toContain('The local time is twelve a.m.');
  });

  it('splits every announcement into phrases that end at a pause', () => {
    for (const a of [welcome(ctx), takeoff(), cruise(ctx), descent(ctx), landing(), arrival(ctx), breakStart(), seatbelt()]) {
      expect(a.parts.join(' ')).toBe(a.text);
      for (const part of a.parts) expect(part).toMatch(/[,.]$/);
    }
    expect(welcome(ctx).parts.slice(0, 3)).toEqual(['Ladies and gentlemen, welcome aboard Hanul Air,', 'flight four seven four,', 'to Tokyo.']);
  });

  it('has scenic versions that stay over the departure city', () => {
    const s = { ...ctx, scenic: true, airline: 'Carry On Airways', minutes: 25, altitudeFt: 6_000 };
    expect(welcome(s).text).toContain('welcome aboard this Carry On Airways scenic flight over Seoul');
    expect(welcome(s).text).toContain("We'll be in the air for about twenty-five minutes");
    expect(cruise(s).text).toContain("We're now cruising at six thousand feet over Seoul");
    expect(cruise(s).text).not.toContain('Tokyo');
    expect(descent(s).text).toContain("we'll shortly begin our approach back into Seoul");
    expect(arrival(s).text).toContain('welcome back to Seoul');
  });

  it('has break and seatbelt announcements', () => {
    expect(breakStart()).toMatchObject({ speaker: 'crew', chime: 'double' });
    expect(seatbelt()).toMatchObject({ speaker: 'captain', chime: 'single' });
    expect(seatbelt().text).toContain('the seatbelt sign has been switched on');
  });
});
