/**
 * Cabin announcement scripts (English). This file is the final script: the voice clips are
 * generated from it, so wording changes here mean regenerating clips (docs/SPEC.md §3.8).
 *
 * Who speaks follows a real flight: the cabin crew welcomes, serves and says goodbye;
 * the captain talks altitude, timing and the seatbelt sign.
 */

export type Speaker = 'captain' | 'crew';

/** PA chime before speaking: two tones before a full announcement, one before a short command. */
export type Chime = 'double' | 'single' | 'none';

export type AnnouncementId = 'welcome' | 'takeoff' | 'cruise' | 'descent' | 'landing' | 'arrival' | 'breakStart' | 'seatbelt';

export interface Announcement {
  id: AnnouncementId;
  speaker: Speaker;
  chime: Chime;
  text: string;
}

export interface AnnouncementContext {
  airline: string;
  /** "HL 474" */
  flightNumber: string;
  fromCity: string;
  toCity: string;
  scenic: boolean;
  /** Planned flight time. */
  minutes: number;
  altitudeFt: number;
  /** Flight minutes left until landing (cruise and descent). */
  remainingMinutes?: number;
  /** Wall-clock time where the announcement is about (greeting, arrival time). */
  local?: { hour: number; minute: number };
}

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty'];

function numberWords(n: number): string {
  if (n < 20) return ONES[n];
  const t = TENS[Math.floor(n / 10)];
  return n % 10 === 0 ? t : `${t}-${ONES[n % 10]}`;
}

/** 100 → "one hour and forty minutes" */
export function spokenDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hours = h === 0 ? '' : `${numberWords(h)} ${h === 1 ? 'hour' : 'hours'}`;
  const mins = m === 0 ? '' : `${numberWords(m)} ${m === 1 ? 'minute' : 'minutes'}`;
  return [hours, mins].filter(Boolean).join(' and ');
}

/** "About" a time, the way a captain rounds it: to 5 minutes once it's 15 or more. */
export function spokenAbout(minutes: number): string {
  const m = Math.max(1, minutes >= 15 ? Math.round(minutes / 5) * 5 : Math.round(minutes));
  return spokenDuration(m);
}

/** "HL 474" → "four seven four", read digit by digit like the cabin crew does. */
export function spokenFlightNumber(flightNumber: string): string {
  return flightNumber
    .replace(/\D/g, '')
    .split('')
    .map((d) => ONES[Number(d)])
    .join(' ');
}

/** 35000 → "thirty-five thousand", 6000 → "six thousand" */
export function spokenAltitude(feet: number): string {
  return `${numberWords(Math.round(feet / 1000))} thousand`;
}

/** 14:13 → "two thirteen p.m.", 9:05 → "nine oh five a.m.", 12:00 → "twelve p.m." */
export function spokenTime(hour: number, minute: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const suffix = hour < 12 ? 'a.m.' : 'p.m.';
  const mins = minute === 0 ? '' : minute < 10 ? ` oh ${ONES[minute]}` : ` ${numberWords(minute)}`;
  return `${numberWords(h12)}${mins} ${suffix}`;
}

/** Greeting word for the hour: "morning", "afternoon" or "evening". */
export function partOfDay(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
}

/** 1 · Cabin crew, right after the boarding pass is torn. */
export function welcome(c: AnnouncementContext): Announcement {
  const opening = c.scenic
    ? `Ladies and gentlemen, welcome aboard this ${c.airline} scenic flight over ${c.fromCity}. ` +
      `We'll be in the air for about ${spokenDuration(c.minutes)}. `
    : `Ladies and gentlemen, welcome aboard ${c.airline} flight ${spokenFlightNumber(c.flightNumber)} to ${c.toCity}. ` +
      `Our flight time today is ${spokenDuration(c.minutes)}. `;
  return {
    id: 'welcome',
    speaker: 'crew',
    chime: 'double',
    text: `${opening}Please fasten your seatbelt, and set your phone to flight mode.`,
  };
}

/** 2 · Captain, straight after the welcome. */
export function takeoff(): Announcement {
  return { id: 'takeoff', speaker: 'captain', chime: 'single', text: 'Cabin crew, please prepare for take-off.' };
}

/** 3 · Captain, at the top of the climb. */
export function cruise(c: AnnouncementContext): Announcement {
  const greeting = `Good ${partOfDay(c.local?.hour ?? 12)} from the flight deck.`;
  const level = c.scenic
    ? `We're now cruising at ${spokenAltitude(c.altitudeFt)} feet over ${c.fromCity}, and the seatbelt sign is now off.`
    : `We've reached our cruising altitude of ${spokenAltitude(c.altitudeFt)} feet, and the seatbelt sign is now off.`;
  const eta =
    !c.scenic && c.remainingMinutes !== undefined
      ? ` We'll have you in ${c.toCity} in about ${spokenAbout(c.remainingMinutes)}.`
      : '';
  return {
    id: 'cruise',
    speaker: 'captain',
    chime: 'double',
    text: `${greeting} ${level}${eta} Sit back, and enjoy the quiet.`,
  };
}

/** 4 · Captain, at the top of descent. */
export function descent(c: AnnouncementContext): Announcement {
  const where = c.scenic ? `we'll shortly begin our approach back into ${c.fromCity}` : `we've begun our descent into ${c.toCity}`;
  const when = c.remainingMinutes !== undefined ? ` We expect to land in about ${spokenAbout(c.remainingMinutes)}.` : '';
  return {
    id: 'descent',
    speaker: 'captain',
    chime: 'double',
    text: `Ladies and gentlemen, ${where}.${when} Please return to your seat and fasten your seatbelt.`,
  };
}

/** 5 · Captain, on final approach. */
export function landing(): Announcement {
  return { id: 'landing', speaker: 'captain', chime: 'single', text: 'Cabin crew, please take your seats for landing.' };
}

/** 6 · Cabin crew, after touchdown. */
export function arrival(c: AnnouncementContext): Announcement {
  const place = c.scenic ? `welcome back to ${c.fromCity}` : `welcome to ${c.toCity}`;
  // spokenTime already ends in "a.m." / "p.m.", which closes the sentence.
  const time = c.local ? ` The local time is ${spokenTime(c.local.hour, c.local.minute)}` : '';
  return {
    id: 'arrival',
    speaker: 'crew',
    chime: 'double',
    text: `Ladies and gentlemen, ${place}.${time} Thank you for flying ${c.airline}.`,
  };
}

/** 8 · Cabin crew, when a long flight pauses for a break. */
export function breakStart(): Announcement {
  return {
    id: 'breakStart',
    speaker: 'crew',
    chime: 'double',
    text: "Ladies and gentlemen, we'll shortly begin our meal service. Feel free to stretch, and take a short break.",
  };
}

/** 9 · Captain, when a break ends or the air gets bumpy. */
export function seatbelt(): Announcement {
  return {
    id: 'seatbelt',
    speaker: 'captain',
    chime: 'single',
    text: 'Ladies and gentlemen, the seatbelt sign has been switched on. Please return to your seats, and fasten your seatbelt.',
  };
}
