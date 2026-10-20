import { cabinAudio } from './cabinAudio';

/**
 * Paper tear, synthesized as many tiny "fiber snaps": short band-passed noise grains.
 * The faster the finger pulls, the denser the grains, so the rip follows the gesture.
 */

/** Grains for a full tear from 0 to 1. */
const GRAINS_PER_TEAR = 70;

let noise: AudioBuffer | null = null;

function noiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noise && noise.sampleRate === ctx.sampleRate) return noise;
  noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return noise;
}

function grain(ctx: AudioContext, out: AudioNode, at: number, level: number, low: boolean) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  // Paper fibers snap bright; the occasional low grain gives the rip some body.
  band.frequency.value = low ? 700 + Math.random() * 600 : 2200 + Math.random() * 4800;
  band.Q.value = 0.7 + Math.random() * 1.6;
  const env = ctx.createGain();
  const length = low ? 0.03 + Math.random() * 0.03 : 0.004 + Math.random() * 0.016;
  env.gain.setValueAtTime(0, at);
  env.gain.linearRampToValueAtTime(level, at + 0.001);
  env.gain.exponentialRampToValueAtTime(0.0001, at + length);
  src.connect(band).connect(env).connect(out);
  src.start(at, Math.random() * 0.45, length + 0.01);
}

export const tearSound = {
  /** Play the rip for a step of tear progress (0..1) spread over `seconds`. */
  advance(delta: number, seconds = 0.016) {
    const io = cabinAudio.output();
    if (!io || delta <= 0) return;
    const { ctx, out } = io;
    const count = Math.max(1, Math.round(delta * GRAINS_PER_TEAR));
    const t0 = ctx.currentTime + 0.005;
    for (let i = 0; i < count; i++) {
      const at = t0 + (i / count) * seconds + Math.random() * 0.006;
      grain(ctx, out, at, 0.18 + Math.random() * 0.3, Math.random() < 0.18);
    }
  },

  /** The last fibers giving way as the stub comes free. */
  snap() {
    const io = cabinAudio.output();
    if (!io) return;
    const { ctx, out } = io;
    const t0 = ctx.currentTime + 0.005;
    for (let i = 0; i < 9; i++) grain(ctx, out, t0 + i * 0.006, 0.35 + Math.random() * 0.25, i % 3 === 0);
  },
};
