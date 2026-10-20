import type { Announcement, Speaker } from '../domain/announcements';
import { cabinAudio } from './cabinAudio';

/**
 * Temporary announcer using the device's built-in voice (Web Speech API).
 * Will be replaced by pre-generated voice clips (docs/SPEC.md §3.8).
 */

/** Device voices to try per speaker, best first: a calm male captain and a clear female crew member. */
const PREFERRED: Record<Speaker, string[]> = {
  captain: [
    'Microsoft Ryan Online (Natural)',
    'Microsoft Guy Online (Natural)',
    'Microsoft George',
    'Microsoft David',
    'Daniel',
    'Oliver',
    'Arthur',
    'Google UK English Male',
    'Google US English Male',
  ],
  crew: [
    'Microsoft Sonia Online (Natural)',
    'Microsoft Aria Online (Natural)',
    'Microsoft Jenny Online (Natural)',
    'Microsoft Hazel',
    'Microsoft Zira',
    'Serena',
    'Samantha',
    'Karen',
    'Google UK English Female',
    'Google US English',
  ],
};

const GENDER_WORD: Record<Speaker, string> = { captain: 'male', crew: 'female' };

function pickVoice(speaker: Speaker): SpeechSynthesisVoice | undefined {
  const voices = speechSynthesis.getVoices();
  for (const name of PREFERRED[speaker]) {
    const v = voices.find((x) => x.name.toLowerCase().includes(name.toLowerCase()));
    if (v) return v;
  }
  return (
    voices.find((v) => v.lang.startsWith('en') && v.name.toLowerCase().includes(GENDER_WORD[speaker])) ??
    voices.find((v) => v.lang.startsWith('en'))
  );
}

/** Wait after the chime so it rings out before the voice starts. */
const CHIME_GAP_MS = { double: 1000, single: 450, none: 0 } as const;

let queue: Promise<void> = Promise.resolve();
/** Bumped by silenceAnnouncements so queued announcements are dropped. */
let generation = 0;

/** Chime, speak, done. Announcements queue up and never overlap. */
export function announce(a: Announcement): Promise<void> {
  const gen = generation;
  queue = queue.then(
    () =>
      new Promise<void>((resolve) => {
        if (!('speechSynthesis' in window) || gen !== generation) return resolve();
        cabinAudio.duck(true);
        if (a.chime !== 'none') cabinAudio.chime(a.chime);
        const utter = new SpeechSynthesisUtterance(a.text);
        const voice = pickVoice(a.speaker);
        if (voice) utter.voice = voice;
        utter.lang = voice?.lang ?? 'en-US';
        utter.pitch = a.speaker === 'captain' ? 0.95 : 1.02;
        utter.rate = 1.0;
        const done = () => {
          cabinAudio.duck(false);
          resolve();
        };
        utter.onend = done;
        utter.onerror = done;
        setTimeout(() => (gen === generation ? speechSynthesis.speak(utter) : done()), CHIME_GAP_MS[a.chime]);
      }),
  );
  return queue;
}

export function silenceAnnouncements() {
  generation++;
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  cabinAudio.duck(false);
}
