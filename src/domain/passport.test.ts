import { describe, expect, it } from 'vitest';
import { COUNTRIES } from '../data/countries';
import { CITIES } from '../data/cities';
import type { Flight, Profile } from '../db/db';
import {
  checkDigit,
  flightLog,
  holderOf,
  mrzLines,
  mrzName,
  passengerName,
  stampDate,
  stampsFor,
  STAMPS_PER_PAGE,
  visaPages,
} from './passport';

const profile: Profile = {
  id: 'me',
  name: 'Seidon',
  surname: 'Han',
  nationality: 'KR',
  currentCityCode: 'ICN',
  miles: 0,
  lifetimeMiles: 0,
  activeCarrierId: 'c',
  createdAt: Date.UTC(2026, 9, 20, 3),
};

let n = 0;
function flight(from: string, to: string, extra: Partial<Flight> = {}): Flight {
  n++;
  return {
    id: `f${n}`,
    fromCode: from,
    toCode: to,
    scenic: from === to,
    airlineCode: 'HL',
    flightNumber: `HL ${400 + n}`,
    gate: 'A1',
    seat: '12A',
    cabin: 'economy',
    purpose: 'study',
    plannedMinutes: 120,
    startedAt: Date.UTC(2026, 9, 20, 1) + n * 86_400_000,
    endedAt: Date.UTC(2026, 9, 20, 3) + n * 86_400_000,
    status: 'landed',
    miles: 700,
    ...extra,
  };
}

describe('machine-readable zone', () => {
  it('computes ICAO 9303 check digits (the spec example passport)', () => {
    expect(checkDigit('L898902C3')).toBe('6');
    expect(checkDigit('740812')).toBe('2');
    expect(checkDigit('120415')).toBe('9');
    expect(checkDigit('ZE184226B<<<<<')).toBe('1');
    expect(checkDigit('L898902C36' + '7408122' + '1204159' + 'ZE184226B<<<<<1')).toBe('0');
  });

  it('writes names as SURNAME<<GIVEN<NAMES in Latin letters', () => {
    expect(mrzName('Eriksson', 'Anna María')).toBe('ERIKSSON<<ANNA<MARIA');
    expect(mrzName('', 'Traveler')).toBe('TRAVELER');
    expect(mrzName('한', '세이돈')).toBe('TRAVELER');
  });

  it('prints two lines of 44 with valid check digits', () => {
    const [l1, l2] = mrzLines(holderOf(profile));
    expect(l1).toHaveLength(44);
    expect(l2).toHaveLength(44);
    expect(l1.startsWith('P<KORHAN<<SEIDON<')).toBe(true);
    expect(l2.slice(10, 13)).toBe('KOR');
    expect(l2[9]).toBe(checkDigit(l2.slice(0, 9)));
    expect(l2[27]).toBe(checkDigit(l2.slice(21, 27)));
    expect(l2[43]).toBe(checkDigit(l2.slice(0, 10) + l2.slice(13, 20) + l2.slice(21, 43)));
  });

  it('keeps one passport number per profile, valid for ten years', () => {
    const h = holderOf(profile);
    expect(h.passportNo).toMatch(/^CO\d{7}$/);
    expect(holderOf({ ...profile, name: 'Other' }).passportNo).toBe(h.passportNo);
    expect(h.expires.getFullYear() - h.issued.getFullYear()).toBe(10);
  });

  it('defaults the nationality to the home country, and prints boarding-pass names', () => {
    expect(holderOf({ ...profile, nationality: undefined }).nationality).toBe('KR');
    expect(passengerName(profile)).toBe('Han/Seidon');
    expect(passengerName({ ...profile, surname: undefined })).toBe('Seidon');
  });
});

describe('stamps', () => {
  it('stamps out of the origin and into the destination when crossing a border', () => {
    const stamps = stampsFor([flight('ICN', 'HND')]);
    expect(stamps.map((s) => [s.kind, s.countryCode, s.airportCode])).toEqual([
      ['exit', 'KR', 'ICN'],
      ['entry', 'JP', 'HND'],
    ]);
    expect(stamps[1].style.entry).toContain('上陸許可');
    expect(stamps[1].airport).toBe('Haneda');
  });

  it('gives scenic and domestic flights the Carry On stamp, and none for flights not landed', () => {
    const stamps = stampsFor([
      flight('ICN', 'ICN'),
      flight('ICN', 'PUS'),
      flight('ICN', 'HND', { status: 'diverted' }),
      flight('ICN', 'HND', { status: 'in_flight' }),
    ]);
    expect(stamps.map((s) => [s.kind, s.countryCode, s.style.entry])).toEqual([
      ['landed', null, 'SCENIC FLIGHT'],
      ['landed', null, 'DOMESTIC'],
    ]);
  });

  it('prints dates the local way, in the local time zone', () => {
    const at = Date.UTC(2026, 9, 20, 16, 30); // already the 21st in Seoul and Tokyo, still the 20th in New York
    expect(stampDate(at, 'Asia/Seoul', 'KR')).toBe('2026.10.21');
    expect(stampDate(at, 'America/New_York', 'US')).toBe('OCT 20 2026');
    expect(stampDate(at, 'Europe/Paris', 'FR')).toBe('20.10.26');
    expect(stampDate(at, 'Asia/Bangkok', 'TH')).toBe('20 OCT 2026');
  });

  it('has a stamp style for every country the app flies to', () => {
    const covered = new Set(COUNTRIES.map((c) => c.code));
    for (const city of CITIES) expect(covered.has(city.countryCode), city.countryCode).toBe(true);
  });

  it('lays stamps out six to a page without moving old ones, always leaving room', () => {
    const stamps = stampsFor(Array.from({ length: 4 }, () => flight('ICN', 'HND')));
    const pages = visaPages(stamps);
    expect(pages).toHaveLength(2);
    expect(pages[0]).toHaveLength(STAMPS_PER_PAGE);
    expect(pages[1]).toHaveLength(2);
    expect(visaPages(stamps.slice(0, 3))[0]).toEqual(pages[0].slice(0, 3));
    expect(visaPages(stamps.slice(0, 6))).toHaveLength(2);
    for (const p of pages.flat()) {
      expect(p.x).toBeGreaterThan(14);
      expect(p.x).toBeLessThan(86);
      expect(Math.abs(p.rotate)).toBeLessThanOrEqual(13);
    }
  });
});

describe('flight log', () => {
  it('sums up landed flights', () => {
    const log = flightLog([
      flight('ICN', 'HND', { plannedMinutes: 135 }),
      flight('HND', 'ICN', { plannedMinutes: 140, purpose: 'work' }),
      flight('ICN', 'HND', { plannedMinutes: 135 }),
      flight('ICN', 'CDG', { status: 'diverted' }),
    ]);
    expect(log).toMatchObject({ flights: 3, minutes: 410, countries: 2, cities: 2, diverted: 1 });
    expect(log.longest).toEqual({ from: 'Tokyo', to: 'Seoul', minutes: 140 });
    expect(log.mostVisited).toEqual({ city: 'Tokyo', times: 2 });
    expect(log.minutesByPurpose).toEqual({ study: 270, work: 140 });
  });
});
