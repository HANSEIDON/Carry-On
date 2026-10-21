import { cityByCode, DEFAULT_HOME_CODE } from '../data/cities';
import { countryByCode, HOUSE_STAMP, type StampStyle } from '../data/countries';
import type { Flight, Profile, TripPurpose } from '../db/db';
import { hashString, seededRandom } from './random';

/**
 * The traveler's passport: the data page (with a real ICAO 9303 machine-readable zone), the entry
 * and exit stamps earned by landed flights, and the flight log printed on the endorsements page.
 */

export interface PassportHolder {
  surname: string;
  givenNames: string;
  /** ISO 3166-1 alpha-2. */
  nationality: string;
  passportNo: string;
  issued: Date;
  expires: Date;
}

/** Nationality until the traveler picks one: the country of the city everyone starts in. */
export const DEFAULT_NATIONALITY = cityByCode(DEFAULT_HOME_CODE)!.countryCode;

export function holderOf(profile: Profile): PassportHolder {
  const issued = new Date(profile.createdAt);
  const expires = new Date(issued);
  expires.setFullYear(expires.getFullYear() + 10);
  expires.setDate(expires.getDate() - 1);
  return {
    surname: profile.surname?.trim() ?? '',
    givenNames: profile.name.trim() || 'Traveler',
    nationality: profile.nationality ?? DEFAULT_NATIONALITY,
    passportNo: passportNumber(profile.createdAt),
    issued,
    expires,
  };
}

/** "CO" and seven digits, fixed for the profile (it never changes, like a real passport number). */
export function passportNumber(createdAt: number): string {
  return `CO${String(hashString(`passport|${createdAt}`) % 10_000_000).padStart(7, '0')}`;
}

/** How the boarding pass prints the passenger: "HAN/SEIDON", or the given names alone. */
export function passengerName(profile: Profile): string {
  const surname = profile.surname?.trim();
  return surname ? `${surname}/${profile.name.trim()}` : profile.name;
}

// --- Machine-readable zone (ICAO 9303, TD3: two lines of 44) -------------------------------------

/** Check digit: weights 7, 3, 1 repeating; digits count as themselves, A–Z as 10–35, "<" as 0. */
export function checkDigit(field: string): string {
  const weights = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < field.length; i++) {
    const ch = field[i];
    const value = ch >= '0' && ch <= '9' ? Number(ch) : ch >= 'A' && ch <= 'Z' ? ch.charCodeAt(0) - 55 : 0;
    sum += value * weights[i % 3];
  }
  return String(sum % 10);
}

/** Letters only, as the MRZ prints them: accents dropped, spaces and hyphens as "<". */
function mrzLetters(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]+/g, '<')
    .replace(/^<+|<+$/g, '');
}

/** "ERIKSSON<<ANNA<MARIA"; a name without Latin letters (e.g. Hangul) reads as TRAVELER. */
export function mrzName(surname: string, givenNames: string): string {
  const last = mrzLetters(surname);
  const given = mrzLetters(givenNames);
  if (!last && !given) return 'TRAVELER';
  return last ? `${last}<<${given}` : given;
}

function yymmdd(d: Date): string {
  const two = (n: number) => String(n).padStart(2, '0');
  return `${two(d.getFullYear() % 100)}${two(d.getMonth() + 1)}${two(d.getDate())}`;
}

/** The two MRZ lines. Birth date and sex aren't asked for, so they print as fillers. */
export function mrzLines(h: PassportHolder): [string, string] {
  const state = countryByCode(h.nationality)?.iso3 ?? 'XXX';
  const line1 = `P<${state}${mrzName(h.surname, h.givenNames)}`.padEnd(44, '<').slice(0, 44);
  const number = h.passportNo.padEnd(9, '<').slice(0, 9);
  const birth = '<<<<<<';
  const expiry = yymmdd(h.expires);
  const personal = '<'.repeat(14);
  const numberPart = number + checkDigit(number);
  const birthPart = birth + checkDigit(birth);
  const expiryPart = expiry + checkDigit(expiry);
  const personalPart = `${personal}<`;
  const composite = checkDigit(numberPart + birthPart + expiryPart + personalPart);
  return [line1, `${numberPart}${state}${birthPart}<${expiryPart}${personalPart}${composite}`];
}

// --- Stamps --------------------------------------------------------------------------------------

export type StampKind = 'entry' | 'exit' | 'landed';

export interface PassportStampData {
  id: string;
  kind: StampKind;
  style: StampStyle;
  /** Null for Carry On's own stamp. */
  countryCode: string | null;
  airportCode: string;
  airport: string;
  city: string;
  /** Local date where it was stamped. */
  date: string;
  flightNumber: string;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const EAST_ASIA = new Set(['KR', 'JP', 'CN', 'TW', 'HK', 'MO']);
const NORTH_AMERICA = new Set(['US', 'GU', 'MP', 'CA']);

/** The date the way that country's stamp prints it: 2026.10.21 · OCT 21 2026 · 21.10.26 · 21 OCT 2026. */
export function stampDate(at: number, tz: string, countryCode: string | null): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric' })
      .formatToParts(new Date(at))
      .map((p) => [p.type, p.value]),
  );
  const y = parts.year;
  const m = Number(parts.month);
  const d = parts.day.padStart(2, '0');
  if (countryCode && EAST_ASIA.has(countryCode)) return `${y}.${String(m).padStart(2, '0')}.${d}`;
  if (countryCode && NORTH_AMERICA.has(countryCode)) return `${MONTHS[m - 1]} ${d} ${y}`;
  if (countryCode && countryByCode(countryCode)?.stamp.shape === 'schengen') {
    return `${d}.${String(m).padStart(2, '0')}.${y.slice(2)}`;
  }
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/**
 * Stamps from landed flights, oldest first. Crossing a border gets an exit stamp from the
 * country left and an entry stamp from the country reached; a flight that stays in the country
 * (a scenic loop, a domestic hop) gets Carry On's own round stamp.
 */
export function stampsFor(flights: Flight[]): PassportStampData[] {
  const landed = flights
    .filter((f) => f.status === 'landed')
    .sort((a, b) => (a.endedAt ?? a.startedAt) - (b.endedAt ?? b.startedAt));
  const stamps: PassportStampData[] = [];
  for (const f of landed) {
    const from = cityByCode(f.fromCode);
    const to = cityByCode(f.toCode);
    if (!from || !to) continue;
    const endedAt = f.endedAt ?? f.startedAt;
    const base = { flightNumber: f.flightNumber };
    if (f.scenic || from.countryCode === to.countryCode) {
      stamps.push({
        ...base,
        id: `${f.id}|landed`,
        kind: 'landed',
        style: { ...HOUSE_STAMP, entry: f.scenic ? 'SCENIC FLIGHT' : 'DOMESTIC' },
        countryCode: null,
        airportCode: to.code,
        airport: to.airport,
        city: to.city,
        date: stampDate(endedAt, to.tz, null),
      });
      continue;
    }
    for (const [kind, city, at] of [
      ['exit', from, f.startedAt],
      ['entry', to, endedAt],
    ] as const) {
      const style = countryByCode(city.countryCode)?.stamp ?? { ...HOUSE_STAMP, entry: 'ARRIVED' };
      stamps.push({
        ...base,
        id: `${f.id}|${kind}`,
        kind,
        style,
        countryCode: city.countryCode,
        airportCode: city.code,
        airport: city.airport,
        city: city.city,
        date: stampDate(at, city.tz, city.countryCode),
      });
    }
  }
  return stamps;
}

export interface PlacedStamp {
  stamp: PassportStampData;
  /** Center, in % of the page. */
  x: number;
  y: number;
  /** Degrees. */
  rotate: number;
}

export const STAMPS_PER_PAGE = 6;

/** Slot centers on a (landscape) visa page: three columns, two rows, filled in a shuffled order per page. */
const SLOTS: [number, number][] = [
  [19, 37],
  [50, 37],
  [81, 37],
  [19, 74],
  [50, 74],
  [81, 74],
];

/**
 * Stamps laid out on visa pages, the way officers find a free spot: a slot each, slightly off
 * center and a little crooked. Deterministic, and earlier stamps never move when new ones arrive.
 * There's always at least one page with room left, and at least two visa pages.
 */
export function visaPages(stamps: PassportStampData[]): PlacedStamp[][] {
  const count = Math.max(2, Math.floor(stamps.length / STAMPS_PER_PAGE) + 1);
  return Array.from({ length: count }, (_, page) => {
    const order = shuffled(SLOTS.length, seededRandom(hashString(`visa page ${page}`)));
    return stamps.slice(page * STAMPS_PER_PAGE, (page + 1) * STAMPS_PER_PAGE).map((stamp, i) => {
      const rand = seededRandom(hashString(stamp.id));
      const [x, y] = SLOTS[order[i]];
      return { stamp, x: x + (rand() - 0.5) * 7, y: y + (rand() - 0.5) * 7, rotate: (rand() - 0.5) * 26 };
    });
  });
}

function shuffled(n: number, rand: () => number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// --- Flight log (endorsements page) --------------------------------------------------------------

export interface FlightLog {
  flights: number;
  minutes: number;
  countries: number;
  cities: number;
  diverted: number;
  longest: { from: string; to: string; minutes: number } | null;
  mostVisited: { city: string; times: number } | null;
  minutesByPurpose: Partial<Record<TripPurpose, number>>;
}

export function flightLog(flights: Flight[]): FlightLog {
  const landed = flights.filter((f) => f.status === 'landed');
  const countries = new Set<string>();
  const visits = new Map<string, number>();
  const minutesByPurpose: Partial<Record<TripPurpose, number>> = {};
  let longest: FlightLog['longest'] = null;
  for (const f of landed) {
    const from = cityByCode(f.fromCode);
    const to = cityByCode(f.toCode);
    if (from) countries.add(from.countryCode);
    if (to) {
      countries.add(to.countryCode);
      visits.set(to.city, (visits.get(to.city) ?? 0) + 1);
    }
    minutesByPurpose[f.purpose] = (minutesByPurpose[f.purpose] ?? 0) + f.plannedMinutes;
    if (from && to && (!longest || f.plannedMinutes > longest.minutes)) {
      longest = { from: from.city, to: f.scenic ? `${to.city} (scenic)` : to.city, minutes: f.plannedMinutes };
    }
  }
  const top = [...visits].sort((a, b) => b[1] - a[1])[0];
  return {
    flights: landed.length,
    minutes: landed.reduce((sum, f) => sum + f.plannedMinutes, 0),
    countries: countries.size,
    cities: visits.size,
    diverted: flights.filter((f) => f.status === 'diverted').length,
    longest,
    mostVisited: top ? { city: top[0], times: top[1] } : null,
    minutesByPurpose,
  };
}
