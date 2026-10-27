import type { Announcement, Speaker } from '../domain/announcements';
import { clipKey, VOICE_GAIN_DB, voiceFor } from '../domain/voiceClips';
import { useSettings } from '../store/settings';
import { announcementShare, cabinAudio } from './cabinAudio';
import { keyLine, paChain, PA_PRESETS } from './pa';

/**
 * Cabin announcements from pre-generated voice clips: one clip per phrase (src/domain/voiceClips.ts,
 * made by scripts/tts/generate_clips.py), played in a row through the cabin PA filter. The cabin
 * sound keeps its level underneath, as on a real flight.
 *
 * If any clip of an announcement is missing (not generated yet), the whole announcement falls
 * back to the device's own voice (Web Speech API).
 */

const PA = PA_PRESETS.cabin;

/**
 * The device's own voice (used while a phrase has no clip yet) is set this much above the clip
 * share: clips come out of the PA chain with makeup gain, a device voice comes out bare.
 */
const DEVICE_VOICE_BOOST = 2.6;

/** Pause between phrases: short at a comma, longer between sentences; the captain takes a little longer. */
const COMMA_GAP = 0.14;
const SENTENCE_GAP: Record<Speaker, number> = { captain: 0.36, crew: 0.24 };
/** Wait after the chime so it rings out before the voice starts. */
const CHIME_GAP = { double: 1, single: 0.45, none: 0 } as const;
/** Decoded clips kept for reuse (the fixed phrases come back every flight). */
const CACHE_SIZE = 48;

let flightNumber = '';
let queue: Promise<void> = Promise.resolve();
/** Bumped by silenceAnnouncements so queued announcements are dropped. */
let generation = 0;
let stopPlaying: (() => void) | null = null;
/** Announcements waiting their turn or on the air (a preview only plays when there are none). */
let pending = 0;
/** The announcement on the air now: its level node and its voice's evening-out gain. */
let live: { ctx: AudioContext; level: GainNode; voiceGain: number } | null = null;

/** Moving the announcement volume turns the one on the air up or down at once, not just the next. */
useSettings.subscribe((s, before) => {
  if (s.announcementLevel === before.announcementLevel || !live) return;
  live.level.gain.setTargetAtTime(announcementShare(s.announcementLevel) * live.voiceGain, live.ctx.currentTime, 0.05);
});

/** The flight being announced on: it decides which captain is flying today. */
export function setAnnouncementFlight(number: string) {
  flightNumber = number;
}

/** Chime, speak, done. Announcements queue up and never overlap. */
export function announce(a: Announcement): Promise<void> {
  const gen = generation;
  pending++;
  queue = queue.then(async () => {
    try {
      if (gen !== generation) return;
      const clips = await loadClips(a).catch(() => null);
      if (gen !== generation) return;
      await (clips ? playClips(a, clips) : speak(a));
    } finally {
      pending--;
    }
  });
  return queue;
}

/**
 * A short line from the crew at the current announcement volume, to hear what the setting sounds
 * like against the cabin. Only with the cabin sound on. If an announcement is already on the air,
 * there's no preview: that one changes level as the slider moves. The preview takes its turn in the
 * same queue, so an announcement that comes up during it waits until it's done.
 */
export function previewAnnouncement() {
  if (pending > 0 || !cabinAudio.output()) return;
  const parts = ['Ladies and gentlemen, welcome aboard Carry On Airways.'];
  const preview = { id: 'welcome', speaker: 'crew', chime: 'none', parts, text: parts.join(' ') } as Announcement;
  const gen = generation;
  pending++;
  queue = queue.then(async () => {
    try {
      const clips = await loadClips(preview).catch(() => null);
      if (clips && gen === generation) await playClips(preview, clips);
    } finally {
      pending--;
    }
  });
}

export function silenceAnnouncements() {
  generation++;
  stopPlaying?.();
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

// --- Clips ------------------------------------------------------------------------------------

const indexes = new Map<string, Promise<Set<string>>>();
const buffers = new Map<string, Promise<AudioBuffer>>();

function clipUrl(voice: string, file: string) {
  return `${import.meta.env.BASE_URL}audio/voice/${voice}/${file}`;
}

/** The clips a voice has (its clips.json), fetched once. */
function clipIndex(voice: string): Promise<Set<string>> {
  let index = indexes.get(voice);
  if (!index) {
    index = fetch(clipUrl(voice, 'clips.json'))
      .then((res) => (res.ok ? res.json() : []))
      .then((keys: string[]) => new Set(keys))
      .catch(() => new Set<string>());
    indexes.set(voice, index);
  }
  return index;
}

function clip(ctx: BaseAudioContext, voice: string, key: string): Promise<AudioBuffer> {
  const id = `${voice}/${key}`;
  let buffer = buffers.get(id);
  if (!buffer) {
    buffer = fetch(clipUrl(voice, `${key}.mp3`))
      .then((res) => {
        if (!res.ok) throw new Error(`missing clip ${id}`);
        return res.arrayBuffer();
      })
      .then((data) => ctx.decodeAudioData(data));
    buffer.catch(() => buffers.delete(id));
    buffers.set(id, buffer);
    if (buffers.size > CACHE_SIZE) buffers.delete(buffers.keys().next().value!);
  }
  return buffer;
}

/** Every clip of the announcement, or null if the cabin audio isn't running or a clip is missing. */
async function loadClips(a: Announcement): Promise<AudioBuffer[] | null> {
  const out = cabinAudio.output();
  if (!out) return null;
  const voice = voiceFor(a.speaker, flightNumber);
  const keys = a.parts.map(clipKey);
  const have = await clipIndex(voice);
  if (!keys.every((k) => have.has(k))) return null;
  return Promise.all(keys.map((k) => clip(out.ctx, voice, k)));
}

function playClips(a: Announcement, clips: AudioBuffer[]): Promise<void> {
  const { ctx, out } = cabinAudio.output()!;
  // On the PA bus, which follows the volume setting: the voice sits at the chosen share of the
  // cabin, each voice evened out so the captain and the crew sound equally loud.
  const voice = voiceFor(a.speaker, flightNumber);
  const share = announcementShare(useSettings.getState().announcementLevel);
  const voiceGain = 10 ** ((VOICE_GAIN_DB[voice] ?? 0) / 20);
  const level = new GainNode(ctx, { gain: share * voiceGain });
  level.connect(out);
  const onAir = { ctx, level, voiceGain };
  live = onAir;
  const pa = paChain(ctx, PA);
  pa.out.connect(level);

  if (a.chime !== 'none') cabinAudio.chime(a.chime);
  const start = ctx.currentTime + 0.05 + CHIME_GAP[a.chime];
  let at = start;
  const sources: AudioScheduledSourceNode[] = clips.map((buffer, i) => {
    const src = new AudioBufferSourceNode(ctx, { buffer });
    src.connect(pa.input);
    src.start(at);
    at += buffer.duration;
    if (i < clips.length - 1) at += a.parts[i].endsWith(',') ? COMMA_GAP : SENTENCE_GAP[a.speaker];
    return src;
  });
  sources.push(...keyLine(ctx, PA, start - 0.18, at + 0.25, level));

  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      if (stopPlaying === stop) stopPlaying = null;
      if (live === onAir) live = null;
      // Let the room reflection ring out before letting go of the nodes.
      setTimeout(() => level.disconnect(), 600);
      resolve();
    };
    const stop = () => {
      for (const s of sources) {
        try {
          s.stop();
        } catch {
          // Not started yet or already stopped.
        }
      }
      finish();
    };
    const timer = setTimeout(finish, (at + 0.4 - ctx.currentTime) * 1000);
    stopPlaying = stop;
  });
}

// --- Device voice fallback (Web Speech API) ---------------------------------------------------

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

function speak(a: Announcement): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) return resolve();
    const gen = generation;
    if (a.chime !== 'none') cabinAudio.chime(a.chime);
    const utter = new SpeechSynthesisUtterance(a.text);
    const voice = pickVoice(a.speaker);
    if (voice) utter.voice = voice;
    utter.lang = voice?.lang ?? 'en-US';
    // A weightier captain, an unhurried crew member.
    utter.pitch = a.speaker === 'captain' ? 0.88 : 0.98;
    utter.rate = 0.97;
    // The device voice skips the PA chain (and its makeup gain): turned up to sit where the clips do.
    const s = useSettings.getState();
    utter.volume = Math.min(1, s.volume * announcementShare(s.announcementLevel) * DEVICE_VOICE_BOOST);
    utter.onend = () => resolve();
    utter.onerror = () => resolve();
    setTimeout(() => (gen === generation ? speechSynthesis.speak(utter) : resolve()), CHIME_GAP[a.chime] * 1000);
  });
}
