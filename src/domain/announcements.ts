/** Cabin announcement scripts (English). Phase 1 reads them with the device voice; recorded TTS comes later. */

export interface AnnouncementContext {
  airline: string;
  /** "HL 474" */
  flightNumber: string;
  fromCity: string;
  toCity: string;
  scenic: boolean;
  minutes: number;
  altitudeFt: number;
  /** "12:18" */
  localTime?: string;
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

/** "HL 474" → "flight four seven four", read digit by digit like the cabin crew does. */
export function spokenFlight(flightNumber: string): string {
  const digits = flightNumber.replace(/\D/g, '').split('').map((d) => ONES[Number(d)]);
  return `flight ${digits.join(' ')}`;
}

export function welcome(c: AnnouncementContext): string {
  const where = c.scenic ? `this scenic flight over ${c.fromCity}` : `${spokenFlight(c.flightNumber)} to ${c.toCity}`;
  return (
    `Ladies and gentlemen, welcome aboard ${c.airline}, ${where}. ` +
    `Our flight time today will be ${spokenDuration(c.minutes)}. ` +
    'Please make sure your seatbelt is securely fastened. We wish you a calm and focused flight.'
  );
}

export function cruise(c: AnnouncementContext): string {
  const feet = Math.round(c.altitudeFt / 1000) * 1000;
  return (
    'Ladies and gentlemen, this is your captain speaking. ' +
    `We have reached our cruising altitude of ${feet.toLocaleString('en-US')} feet. ` +
    'The seatbelt sign is now off. Sit back, relax, and enjoy the quiet.'
  );
}

export function descent(c: AnnouncementContext): string {
  const place = c.scenic ? c.fromCity : c.toCity;
  return (
    `Ladies and gentlemen, we have begun our descent into ${place}. ` +
    'Please return to your seat and fasten your seatbelt.'
  );
}

export function arrival(c: AnnouncementContext): string {
  const place = c.scenic ? c.fromCity : c.toCity;
  const time = c.localTime ? ` The local time is ${c.localTime}.` : '';
  return `Ladies and gentlemen, welcome to ${place}.${time} Thank you for flying ${c.airline}, and well done.`;
}
