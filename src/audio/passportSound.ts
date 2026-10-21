import { cabinAudio } from './cabinAudio';

/**
 * Passport sounds, synthesized (no files):
 *  - a page turning: a dry scrape as the edge lifts, a soft swish of air with the paper fluttering,
 *    and a light flap as it lands
 *  - the cover: the same, heavier and slower, with a muffled thump of the board
 * Every turn comes out a little different, like real paper.
 */

let noise: AudioBuffer | null = null;

function noiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noise && noise.sampleRate === ctx.sampleRate) return noise;
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return noise;
}

const vary = (x: number, by = 0.12) => x * (1 + (Math.random() * 2 - 1) * by);

interface Burst {
  at: number;
  /** Seconds to the peak, then to silence. */
  attack: number;
  decay: number;
  level: number;
  type: BiquadFilterType;
  /** Filter frequency at the start, at the peak and at the end. */
  hz: [number, number, number];
  q?: number;
  /** Paper flutter: a fast wobble in level (Hz, depth 0..1). */
  flutter?: [number, number];
}

function burst(ctx: AudioContext, out: AudioNode, b: Burst) {
  const src = new AudioBufferSourceNode(ctx, { buffer: noiseBuffer(ctx) });
  const filter = new BiquadFilterNode(ctx, { type: b.type, frequency: b.hz[0], Q: b.q ?? 0.8 });
  filter.frequency.setValueAtTime(b.hz[0], b.at);
  filter.frequency.exponentialRampToValueAtTime(b.hz[1], b.at + b.attack);
  filter.frequency.exponentialRampToValueAtTime(b.hz[2], b.at + b.attack + b.decay);
  const env = new GainNode(ctx, { gain: 0 });
  env.gain.setValueAtTime(0.0001, b.at);
  env.gain.exponentialRampToValueAtTime(b.level, b.at + b.attack);
  env.gain.exponentialRampToValueAtTime(0.0001, b.at + b.attack + b.decay);
  let chain: AudioNode = src.connect(filter).connect(env);
  const end = b.at + b.attack + b.decay + 0.05;
  if (b.flutter) {
    const wobble = new GainNode(ctx, { gain: 1 - b.flutter[1] / 2 });
    const lfo = new OscillatorNode(ctx, { frequency: b.flutter[0], type: 'triangle' });
    lfo.connect(new GainNode(ctx, { gain: b.flutter[1] / 2 })).connect(wobble.gain);
    lfo.start(b.at);
    lfo.stop(end);
    chain = chain.connect(wobble);
  }
  chain.connect(out);
  src.start(b.at, Math.random() * 0.4, end - b.at);
}

/** A few tiny crackles of paper fibre. */
function crackle(ctx: AudioContext, out: AudioNode, at: number, count: number, level: number) {
  for (let i = 0; i < count; i++) {
    const t = at + Math.random() * 0.05;
    burst(ctx, out, {
      at: t,
      attack: 0.001,
      decay: 0.004 + Math.random() * 0.01,
      level: level * (0.4 + Math.random() * 0.6),
      type: 'bandpass',
      hz: [2400 + Math.random() * 4000, 2400 + Math.random() * 4000, 2000],
      q: 1.2,
    });
  }
}

function output() {
  cabinAudio.unlock();
  return cabinAudio.output();
}

export const passportSound = {
  /** One page turning; `seconds` is how long the turn takes on screen. */
  page(seconds = 0.5) {
    const io = output();
    if (!io) return;
    const { ctx, out } = io;
    const t = ctx.currentTime + 0.01;
    const length = vary(seconds, 0.08);
    // The edge lifting off the page under a fingertip.
    burst(ctx, out, { at: t, attack: 0.006, decay: 0.035, level: 0.05, type: 'highpass', hz: [4200, 5200, 3800] });
    crackle(ctx, out, t, 3, 0.05);
    // The swish of air as the leaf swings over, fluttering.
    const swish = length * 0.82;
    burst(ctx, out, {
      at: t + 0.02,
      attack: swish * 0.42,
      decay: swish * 0.58,
      level: vary(0.16),
      type: 'bandpass',
      hz: [vary(900), vary(2600), vary(1300)],
      q: 0.7,
      flutter: [vary(19, 0.2), 0.45],
    });
    burst(ctx, out, {
      at: t + 0.02,
      attack: swish * 0.45,
      decay: swish * 0.55,
      level: vary(0.09),
      type: 'lowpass',
      hz: [500, 900, 450],
    });
    // Landing: a soft flap and a whisper of fibre.
    const land = t + length - 0.02;
    burst(ctx, out, { at: land, attack: 0.005, decay: 0.06, level: vary(0.2), type: 'lowpass', hz: [700, 520, 260] });
    crackle(ctx, out, land, 4, 0.06);
  },

  /** The cover: a heavier swing and the thump of the board. */
  cover(opening: boolean, seconds = 0.7) {
    const io = output();
    if (!io) return;
    const { ctx, out } = io;
    const t = ctx.currentTime + 0.01;
    const thump = (at: number, level: number) => {
      burst(ctx, out, { at, attack: 0.004, decay: 0.11, level, type: 'lowpass', hz: [320, 220, 90] });
      burst(ctx, out, { at, attack: 0.002, decay: 0.03, level: level * 0.25, type: 'bandpass', hz: [1800, 1500, 1200], q: 1 });
    };
    // Opening, the board lets go of the pages first; closing, it lands on them at the end.
    if (opening) thump(t, 0.16);
    burst(ctx, out, {
      at: t + 0.03,
      attack: seconds * 0.45,
      decay: seconds * 0.5,
      level: vary(0.12),
      type: 'bandpass',
      hz: [vary(450), vary(1300), vary(700)],
      q: 0.6,
    });
    thump(t + seconds - 0.03, opening ? 0.22 : 0.3);
    crackle(ctx, out, t + seconds - 0.03, 3, 0.04);
  },
};
