/**
 * Cabin PA: what makes a voice sound like an announcement.
 *  - small ceiling speakers: no deep lows, no crisp highs (band-pass)
 *  - a forward, slightly nasal mid-range (peak around 1.5 kHz)
 *  - heavy compression and a little speaker grit (even level, slight crunch)
 *  - many speakers down the cabin: the same voice arriving again 10-35 ms later
 *  - a short, soft cabin reflection
 *  - an open line: faint hiss, and a click when the mic keys up and down
 *
 * Shared by the app's announcer and the sound lab (public/voice-samples/index.html).
 */

export interface PaPreset {
  hp: number;
  lp: number;
  peakHz: number;
  peakDb: number;
  ratio: number;
  threshold: number;
  drive: number;
  /** Later speakers: [delay seconds, level]. */
  taps: [number, number][];
  room: number;
  hiss: number;
  makeup: number;
}

export type PaPresetId = 'light' | 'cabin' | 'vintage';

export const PA_PRESETS: Record<PaPresetId, PaPreset> = {
  light: { hp: 200, lp: 5200, peakHz: 1800, peakDb: 3, ratio: 4, threshold: -22, drive: 1.3, taps: [[0.012, 0.22]], room: 0.1, hiss: 0.0012, makeup: 1.1 },
  cabin: { hp: 300, lp: 3900, peakHz: 1500, peakDb: 5, ratio: 8, threshold: -28, drive: 2.1, taps: [[0.013, 0.32], [0.028, 0.2]], room: 0.16, hiss: 0.0025, makeup: 1.45 },
  vintage: { hp: 420, lp: 3100, peakHz: 1300, peakDb: 7, ratio: 12, threshold: -32, drive: 3.2, taps: [[0.009, 0.38], [0.021, 0.28], [0.035, 0.16]], room: 0.2, hiss: 0.005, makeup: 1.7 },
};

/** The voice goes into `input`; the PA sound comes out of `out`. */
export function paChain(ctx: BaseAudioContext, p: PaPreset): { input: AudioNode; out: AudioNode } {
  const input = new GainNode(ctx);
  const hp = new BiquadFilterNode(ctx, { type: 'highpass', frequency: p.hp, Q: 0.7 });
  const hp2 = new BiquadFilterNode(ctx, { type: 'highpass', frequency: p.hp, Q: 0.7 });
  const lp = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: p.lp, Q: 0.7 });
  const lp2 = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: p.lp, Q: 0.7 });
  const mid = new BiquadFilterNode(ctx, { type: 'peaking', frequency: p.peakHz, Q: 0.9, gain: p.peakDb });
  const comp = new DynamicsCompressorNode(ctx, { threshold: p.threshold, ratio: p.ratio, knee: 6, attack: 0.003, release: 0.12 });
  const drive = new WaveShaperNode(ctx, { curve: softClip(p.drive), oversample: '2x' });
  const out = new GainNode(ctx, { gain: p.makeup });
  input.connect(hp).connect(hp2).connect(lp).connect(lp2).connect(mid).connect(comp).connect(drive);
  drive.connect(out);
  // Speakers further down the cabin.
  for (const [delay, gain] of p.taps) {
    drive.connect(new DelayNode(ctx, { delayTime: delay })).connect(new GainNode(ctx, { gain })).connect(out);
  }
  drive.connect(new ConvolverNode(ctx, { buffer: roomImpulse(ctx, 0.3) })).connect(new GainNode(ctx, { gain: p.room })).connect(out);
  return { input, out };
}

/** The PA line opens a moment before the voice and closes after it: hiss in between, a click at each end. */
export function keyLine(ctx: BaseAudioContext, p: PaPreset, from: number, to: number, dest: AudioNode) {
  const len = Math.ceil(ctx.sampleRate * (to - from + 0.1));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const hiss = new AudioBufferSourceNode(ctx, { buffer: buf });
  const band = new BiquadFilterNode(ctx, { type: 'bandpass', frequency: 2800, Q: 0.4 });
  const env = new GainNode(ctx, { gain: 0 });
  env.gain.setValueAtTime(0, from);
  env.gain.linearRampToValueAtTime(p.hiss, from + 0.02);
  env.gain.setValueAtTime(p.hiss, to - 0.02);
  env.gain.linearRampToValueAtTime(0, to);
  hiss.connect(band).connect(env).connect(dest);
  hiss.start(from);
  hiss.stop(to + 0.05);
  const sources = [hiss];
  for (const t of [from, to]) {
    const click = new AudioBufferSourceNode(ctx, { buffer: buf });
    const clickEnv = new GainNode(ctx, { gain: 0 });
    clickEnv.gain.setValueAtTime(0.05, t);
    clickEnv.gain.exponentialRampToValueAtTime(0.0001, t + 0.012);
    click.connect(new BiquadFilterNode(ctx, { type: 'highpass', frequency: 1200 })).connect(clickEnv).connect(dest);
    click.start(t, 0, 0.02);
    sources.push(click);
  }
  return sources;
}

function softClip(k: number): Float32Array<ArrayBuffer> {
  const n = 1024;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(k * x) / Math.tanh(k);
  }
  return curve;
}

function roomImpulse(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }
  return buf;
}
