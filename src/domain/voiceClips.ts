import { airlineFor, HOUSE_AIRLINE } from '../data/airlines';
import { CITIES } from '../data/cities';
import * as script from './announcements';
import type { Announcement, AnnouncementContext, Speaker } from './announcements';
import { routeBetween, SCENIC_MAX_MINUTES } from './booking';
import { flightState, phaseBounds } from './flightProfile';
import { hashString } from './random';
import type { AircraftClass } from './types';

/**
 * The pre-generated announcement clips: which voices speak, what each clip file is called,
 * and every phrase the script can ever say (the list scripts/tts/generate_clips.py works through).
 */

/** Voice ids (settings in scripts/tts/generate_clips.py). Captains take turns by flight, like a real roster. */
export const VOICES: Record<Speaker, readonly string[]> = {
  captain: ['cb-default', 'cb-george'],
  crew: ['alice-112'],
};

/**
 * How much to turn each voice up (dB) so all of them sound equally loud through the cabin PA. The
 * clips are made at the same loudness, but the PA's small speakers cut the lows, where a man's
 * voice carries more of its weight: measured through the PA chain with ear weighting (BS.1770
 * K-weighting), the captains came out 1.4 and 1.9 dB under the crew.
 */
export const VOICE_GAIN_DB: Record<string, number> = {
  'cb-default': 1.4,
  'cb-george': 1.9,
  'alice-112': 0,
};

/** The voice for a speaker on a flight: fixed per flight number, so one flight keeps one captain. */
export function voiceFor(speaker: Speaker, flightNumber: string): string {
  const voices = VOICES[speaker];
  return voices[hashString(`${speaker}|${flightNumber}`) % voices.length];
}

/** A phrase's clip name: the phrase itself as a slug ("We'll have you in Tokyo," → "well-have-you-in-tokyo"). */
export function clipKey(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export interface ClipPart {
  speaker: Speaker;
  text: string;
  key: string;
}

const AIRCRAFT: AircraftClass[] = ['narrowbody', 'widebody', 'longhaul'];

/**
 * Every phrase any announcement can contain, per speaker. Built by running the real script
 * over every value that changes (airline, flight number, city, duration, altitude, time), so it
 * can't drift from what the app says.
 */
export function allParts(): ClipPart[] {
  const parts = new Map<string, ClipPart>();
  const add = (a: Announcement) => {
    for (const text of a.parts) parts.set(`${a.speaker}|${text}`, { speaker: a.speaker, text, key: clipKey(text) });
  };

  const home = CITIES[0];
  const base: AnnouncementContext = {
    airline: HOUSE_AIRLINE.name,
    flightNumber: 'CO 100',
    fromCity: home.city,
    toCity: home.city,
    scenic: false,
    minutes: 60,
    altitudeFt: flightState(0.5, 600, 'narrowbody').altitudeFt,
  };
  const routes = CITIES.flatMap((from) => CITIES.filter((to) => to !== from).map((to) => routeBetween(from, to)));
  const longest = Math.max(...routes.map((r) => r.minutes));

  for (const fixed of [script.takeoff(), script.landing(), script.breakStart(), script.seatbelt()]) add(fixed);

  // Welcome: airline, flight number, destination and flight time each sit in their own phrase.
  for (const airline of new Set([HOUSE_AIRLINE, ...CITIES.map((c) => airlineFor(c.countryCode))])) {
    add(script.welcome({ ...base, airline: airline.name }));
    add(script.arrival({ ...base, airline: airline.name }));
  }
  for (let n = 100; n <= 999; n++) add(script.welcome({ ...base, flightNumber: `CO ${n}` }));
  for (const minutes of new Set(routes.map((r) => r.minutes))) add(script.welcome({ ...base, minutes }));
  for (let minutes = 5; minutes <= SCENIC_MAX_MINUTES; minutes += 5) add(script.welcome({ ...base, scenic: true, minutes }));

  // Per city: destination phrases, and the scenic versions that circle the departure city.
  for (const city of CITIES) {
    const to = { ...base, toCity: city.city };
    const scenic = { ...base, scenic: true, fromCity: city.city, minutes: 25, altitudeFt: flightState(0.5, 45, 'narrowbody', true).altitudeFt };
    for (const c of [to, scenic]) {
      add(script.welcome(c));
      add(script.cruise({ ...c, remainingMinutes: 60 }));
      add(script.descent(c));
      add(script.arrival(c));
    }
  }

  // Cruise: greeting by hour, altitude by aircraft, time to go up to the longest route.
  for (let hour = 0; hour < 24; hour++) add(script.cruise({ ...base, local: { hour, minute: 0 } }));
  for (const aircraft of AIRCRAFT) add(script.cruise({ ...base, altitudeFt: flightState(0.5, 600, aircraft).altitudeFt }));
  for (let m = 0; m <= longest; m++) add(script.cruise({ ...base, remainingMinutes: m }));

  // Descent: time to landing, which never exceeds the descent itself.
  const descentMax = Math.max(...routes.map((r) => (1 - phaseBounds(r.minutes).descentStart) * r.minutes));
  for (let m = 0; m <= Math.ceil(descentMax) + 1; m++) add(script.descent({ ...base, remainingMinutes: m }));

  // Arrival: the local time, as the crew reads it (every 5 minutes).
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 5) add(script.arrival({ ...base, local: { hour, minute } }));
  }

  return [...parts.values()];
}
