import { cabinAudio } from './cabinAudio';

/**
 * Temporary announcer using the device's built-in voice (Web Speech API).
 * Will be replaced by pre-recorded TTS clips (docs/SPEC.md §3.8).
 */

/** Natural-sounding English voices, best first. Falls back to any English voice. */
const PREFERRED = ['Microsoft Aria', 'Microsoft Jenny', 'Google UK English Female', 'Samantha', 'Karen', 'Daniel'];

function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = speechSynthesis.getVoices();
  for (const name of PREFERRED) {
    const v = voices.find((x) => x.name.startsWith(name));
    if (v) return v;
  }
  return voices.find((v) => v.lang.startsWith('en'));
}

let queue: Promise<void> = Promise.resolve();
/** Bumped by silenceAnnouncements so queued announcements are dropped. */
let generation = 0;

/** Chime, duck the cabin noise, speak, restore. Announcements never overlap. */
export function announce(text: string): Promise<void> {
  const gen = generation;
  queue = queue.then(
    () =>
      new Promise<void>((resolve) => {
        if (!('speechSynthesis' in window) || gen !== generation) return resolve();
        cabinAudio.duck(true);
        cabinAudio.chime('double');
        const utter = new SpeechSynthesisUtterance(text);
        const voice = pickVoice();
        if (voice) utter.voice = voice;
        utter.lang = voice?.lang ?? 'en-US';
        utter.rate = 0.93;
        const done = () => {
          cabinAudio.duck(false);
          resolve();
        };
        utter.onend = done;
        utter.onerror = done;
        // Let the chime ring out before speaking.
        setTimeout(() => (gen === generation ? speechSynthesis.speak(utter) : done()), 1300);
      }),
  );
  return queue;
}

export function silenceAnnouncements() {
  generation++;
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  cabinAudio.duck(false);
}
