import type { TripPurpose } from '../db/db';
import type { FlightPhase } from '../domain/flightProfile';
import { CABIN_TIMBRES, type CabinTimbre } from '../domain/cabinTimbre';
import type { CabinClass, SeatZone } from '../domain/seatmap';

/**
 * Cabin sound, synthesized live: a calm, airliner-like roar you can listen to for hours.
 *
 * What a cruising cabin actually sounds like (and what this copies):
 *   - Mostly airflow over the fuselage (turbulent boundary layer): broadband, not tonal, with
 *     its energy in the low mids (~130–400 Hz) and a smooth roll-off above. Toward the nose
 *     the sound is thinner and brighter, toward the tail heavier and lower.
 *   - A faint engine drone underneath, and a little air from the overhead vents.
 *
 * What makes noise unpleasant (psychoacoustics) and is avoided here:
 *   - Tonality (pure tones standing out of the noise)  → the engine is narrow-band noise, not sine waves.
 *   - Sharpness (too much high end)                    → highs rolled off; vent air kept faint.
 *   - Roughness / fluctuation (wobble at ~1–300 Hz)    → no fast modulation; level drifts over 30 s+.
 *   - Audible repetition or loop seams                 → noise is generated continuously (AudioWorklet).
 *
 * With a cabin timbre, the noise is shaped by a filter measured from a real in-flight recording
 * of that aircraft (scripts/sound/make_cabin_ir.py): the real aircraft's sound, generated live.
 *
 * Focus mode (off by default) turns the low rumble down further: low-frequency noise lowers
 * performance on demanding tasks and tires more than its loudness suggests (Persson Waye et al.).
 *
 * Optional focus tones (binaural beats) are off by default: the evidence is mixed, and without
 * headphones the two tones mix into an audible wobble. When on, they sit far below the cabin.
 */

/**
 * Announcements play at a share of the sound level: the volume control moves both, and the voice
 * sits a little under the cabin, in the background. This is the share at the default setting
 * (chosen by ear); the announcement level in sound settings scales it from none to twice that.
 */
export const ANNOUNCEMENT_SHARE = 0.35;

/** The announcement level setting (0..1, default 0.5) as a share of the sound level. */
export function announcementShare(level: number): number {
  return ANNOUNCEMENT_SHARE * 2 * Math.min(1, Math.max(0, level));
}

interface Zone {
  /** Overall loudness of this part of the cabin. */
  level: number;
  /** Center and boost (dB) of the airflow body. */
  bodyHz: number;
  bodyDb: number;
  /** Where the roar rolls off: brighter near the nose, darker toward the tail. */
  toneHz: number;
  /** Overhead vent air. */
  air: number;
  /** Engine drone level and pitch. */
  engine: number;
  engineHz: number;
}

const ZONES: Record<SeatZone, Zone> = {
  front: { level: 0.82, bodyHz: 220, bodyDb: 3.5, toneHz: 1600, air: 0.34, engine: 0.05, engineHz: 86 },
  wing: { level: 1.0, bodyHz: 170, bodyDb: 5, toneHz: 1250, air: 0.26, engine: 0.12, engineHz: 94 },
  rear: { level: 1.1, bodyHz: 145, bodyDb: 6, toneHz: 1050, air: 0.22, engine: 0.16, engineHz: 102 },
};

/** Premium cabins have thicker insulation. */
const CABIN_LEVEL: Record<CabinClass, number> = { economy: 1, business: 0.84, first: 0.72 };

/** Climb thrust is louder and a touch brighter; descent at idle is softer and lower. */
const PHASES: Record<FlightPhase, { level: number; tone: number; engine: number }> = {
  climb: { level: 1.08, tone: 1.18, engine: 1.4 },
  cruise: { level: 1, tone: 1, engine: 1 },
  descent: { level: 0.82, tone: 0.88, engine: 0.6 },
};

/** Binaural beat offsets (Hz) by trip purpose, used only when focus tones are on. */
const PURPOSE_BEAT_HZ: Record<TripPurpose, number> = {
  study: 14,
  work: 15,
  reading: 10,
  creative: 40,
  other: 12,
};

/** Per-seat tilt on top of a recorded timbre: brighter toward the nose, heavier toward the tail. */
const ZONE_TILT: Record<SeatZone, { lowDb: number; highDb: number }> = {
  front: { lowDb: -2, highDb: 2 },
  wing: { lowDb: 0, highDb: 0 },
  rear: { lowDb: 2, highDb: -2.5 },
};

/** White noise through a unit-energy timbre filter, brought up to the bed level. */
const TIMBRE_GAIN = 0.38;
/** Roll-off the flight phase moves for recorded timbres (climb opens it up, descent closes it). */
const TIMBRE_TONE_HZ = 9000;

/** Focus mode: a low shelf that takes the rumble below ~160 Hz down, leaving the cabin's body. */
const FOCUS_MODE_SHELF_HZ = 160;
const FOCUS_MODE_SHELF_DB = -7;

const FOCUS_CARRIER_HZ = 220;
const FOCUS_LEVEL = 0.012;

/** Gain that brings the shaped pink noise up to a comfortable bed level. */
const BODY_GAIN = 1.9;
const FADE_IN = 5;
const FADE_OUT = 1.5;
/** Fallback loop length when AudioWorklet is unavailable (crossfaded, so no seam). */
const FALLBACK_SECONDS = 24;

/** Stereo pink noise (Paul Kellet's filter), generated sample by sample: never repeats. */
const NOISE_WORKLET = `
class PinkNoise extends AudioWorkletProcessor {
  constructor() { super(); this.b = [new Float32Array(7), new Float32Array(7)]; }
  process(_inputs, outputs) {
    const out = outputs[0];
    for (let ch = 0; ch < out.length; ch++) {
      const o = out[ch], b = this.b[ch & 1];
      for (let i = 0; i < o.length; i++) {
        const w = Math.random() * 2 - 1;
        b[0] = 0.99886 * b[0] + w * 0.0555179;
        b[1] = 0.99332 * b[1] + w * 0.0750759;
        b[2] = 0.969 * b[2] + w * 0.153852;
        b[3] = 0.8665 * b[3] + w * 0.3104856;
        b[4] = 0.55 * b[4] + w * 0.5329522;
        b[5] = -0.7616 * b[5] - w * 0.016898;
        o[i] = (b[0] + b[1] + b[2] + b[3] + b[4] + b[5] + b[6] + w * 0.5362) * 0.11;
        b[6] = w * 0.115926;
      }
    }
    return true;
  }
}
registerProcessor('carry-on-pink-noise', PinkNoise);

class WhiteNoise extends AudioWorkletProcessor {
  process(_inputs, outputs) {
    for (const o of outputs[0]) for (let i = 0; i < o.length; i++) o[i] = Math.random() * 2 - 1;
    return true;
  }
}
registerProcessor('carry-on-white-noise', WhiteNoise);
`;

class CabinAudio {
  private ctx: AudioContext | null = null;
  /** The cabin noise and, separately, the PA (chimes, voice, the ticket tear): see unlock(). */
  private cabinBus: GainNode | null = null;
  private paBus: GainNode | null = null;
  private bed: GainNode | null = null;
  private stopNodes: (() => void) | null = null;
  private zone: Zone = ZONES.wing;
  private cabinLevel = 1;
  private phase: FlightPhase = 'cruise';
  private volume = 0.45;
  private workletReady = false;
  private toneFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;
  /** The roll-off the current flight phase scales (depends on synthesized vs recorded cabin). */
  private toneBase = 1250;
  private timbres = new Map<CabinTimbre, AudioBuffer>();
  private timbresLoading: Promise<void> | null = null;
  private focus: { gain: GainNode; stop: () => void } | null = null;
  private focusMode = false;
  private bassShelf: BiquadFilterNode | null = null;

  /** Must run inside a user gesture (tap, key press) or browsers keep audio muted. */
  unlock(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      // Two buses, each with its own gentle limiter so nothing clips. On a real flight the cabin
      // doesn't get quieter when someone speaks, so the PA never shares a limiter with the cabin:
      // a shared one would pull the cabin down under every chime and announcement.
      const limiter = () => new DynamicsCompressorNode(this.ctx!, { threshold: -6, knee: 6, ratio: 8, attack: 0.005, release: 0.2 });
      this.cabinBus = new GainNode(this.ctx, { gain: this.volume });
      this.cabinBus.connect(limiter()).connect(this.ctx.destination);
      this.paBus = new GainNode(this.ctx, { gain: this.volume });
      this.paBus.connect(limiter()).connect(this.ctx.destination);
      // Load the noise generator early; the first start() usually comes a second later.
      const url = URL.createObjectURL(new Blob([NOISE_WORKLET], { type: 'application/javascript' }));
      this.ctx.audioWorklet
        ?.addModule(url)
        .then(() => (this.workletReady = true))
        .catch(() => (this.workletReady = false));
      void this.loadTimbres();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  /** Fetch the aircraft timbre filters (a few tens of KB each) once; resolves when they're ready. */
  loadTimbres(): Promise<void> {
    const ctx = this.unlock();
    this.timbresLoading ??= Promise.all(
      CABIN_TIMBRES.map(async (t) => {
        const res = await fetch(`${import.meta.env.BASE_URL}audio/cabin/${t}.wav`);
        if (res.ok) this.timbres.set(t, await ctx.decodeAudioData(await res.arrayBuffer()));
      }),
    )
      .then(() => undefined)
      .catch(() => undefined);
    return this.timbresLoading;
  }

  /** The shared context and the PA bus (follows the volume, never touches the cabin), for chimes,
   * announcements and the ticket tear. Null until unlocked. */
  output(): { ctx: AudioContext; out: AudioNode } | null {
    return this.ctx && this.paBus ? { ctx: this.ctx, out: this.paBus } : null;
  }

  get needsGesture(): boolean {
    return !this.ctx || this.ctx.state !== 'running';
  }

  get playing(): boolean {
    return this.stopNodes !== null;
  }

  start(
    zone: SeatZone,
    cabin: CabinClass,
    phase: FlightPhase = 'climb',
    purpose: TripPurpose = 'study',
    focusTones = false,
    timbre?: CabinTimbre,
  ) {
    const ctx = this.unlock();
    this.stop(0);
    this.zone = ZONES[zone];
    this.cabinLevel = CABIN_LEVEL[cabin];
    this.phase = phase;
    const sources: AudioScheduledSourceNode[] = [];
    const generators: AudioNode[] = [];

    // The cabin "breathes": slow, shallow level drift, far below the range we hear as wobble.
    const bed = new GainNode(ctx, { gain: 0 });
    const drift = new GainNode(ctx, { gain: 1 });
    for (const [hz, depth] of [
      [0.021, 0.05],
      [0.047, 0.03],
    ]) {
      const lfo = new OscillatorNode(ctx, { frequency: hz });
      lfo.connect(new GainNode(ctx, { gain: depth })).connect(drift.gain);
      sources.push(lfo);
    }
    const shelf = new BiquadFilterNode(ctx, {
      type: 'lowshelf',
      frequency: FOCUS_MODE_SHELF_HZ,
      gain: this.focusMode ? FOCUS_MODE_SHELF_DB : 0,
    });
    drift.connect(shelf).connect(bed);
    this.bassShelf = shelf;

    const ir = timbre ? this.timbres.get(timbre) : undefined;
    if (ir) this.recordedCabin(ctx, ir, zone, drift, sources, generators);
    else this.synthesizedCabin(ctx, drift, sources, generators);

    bed.connect(this.cabinBus!);
    this.bed = bed;
    for (const s of sources) s.start();
    this.rampBed(FADE_IN);
    this.setFocusTones(focusTones, purpose);

    this.stopNodes = () => {
      for (const s of sources) s.stop();
      for (const g of generators) g.disconnect();
      this.focus?.stop();
      this.focus = null;
      bed.disconnect();
    };
  }

  /**
   * A real aircraft's cabin: white noise through a filter made from an in-flight recording
   * (its median spectrum, so no voices or bumps), then the seat's tilt and the phase's tone.
   * Generated live, so it never repeats.
   */
  private recordedCabin(
    ctx: AudioContext,
    ir: AudioBuffer,
    zone: SeatZone,
    out: AudioNode,
    sources: AudioScheduledSourceNode[],
    generators: AudioNode[],
  ) {
    const tilt = ZONE_TILT[zone];
    const noise = this.noise(ctx, sources, generators, 'white');
    const timbre = new ConvolverNode(ctx, { buffer: ir, disableNormalization: true });
    const low = new BiquadFilterNode(ctx, { type: 'lowshelf', frequency: 160, gain: tilt.lowDb });
    const high = new BiquadFilterNode(ctx, { type: 'highshelf', frequency: 1500, gain: tilt.highDb });
    this.toneBase = TIMBRE_TONE_HZ;
    const tone = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: TIMBRE_TONE_HZ * PHASES[this.phase].tone, Q: 0.5 });
    noise.connect(timbre).connect(low).connect(high).connect(tone).connect(new GainNode(ctx, { gain: TIMBRE_GAIN })).connect(out);
    this.toneFilter = tone;
    this.engineGain = null;
  }

  /** Fallback while the timbre filters load (or without them): a cabin built from shaped pink noise. */
  private synthesizedCabin(ctx: AudioContext, out: AudioNode, sources: AudioScheduledSourceNode[], generators: AudioNode[]) {
    const z = this.zone;
    const p = PHASES[this.phase];

    // 1. Airflow body: pink noise shaped into the low-mid roar of a cruising cabin.
    const bodyNoise = this.noise(ctx, sources, generators);
    // Keep the deep sub-bass out: on headphones it reads as pressure, not as a cabin.
    const subCut = new BiquadFilterNode(ctx, { type: 'highpass', frequency: 85, Q: 0.6 });
    const body = new BiquadFilterNode(ctx, { type: 'peaking', frequency: z.bodyHz, Q: 0.7, gain: z.bodyDb });
    this.toneBase = z.toneHz;
    const tone = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: z.toneHz * p.tone, Q: 0.5 });
    const bodyGain = new GainNode(ctx, { gain: BODY_GAIN });
    bodyNoise.connect(subCut).connect(body).connect(tone).connect(bodyGain).connect(out);
    this.toneFilter = tone;

    // 2. Overhead vent air: a faint, soft hiss well below the roar.
    const airNoise = this.noise(ctx, sources, generators);
    const airBand = new BiquadFilterNode(ctx, { type: 'bandpass', frequency: 2600, Q: 0.6 });
    const airSoft = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 5200, Q: 0.5 });
    airNoise.connect(airBand).connect(airSoft).connect(new GainNode(ctx, { gain: z.air })).connect(out);

    // 3. Engine drone: narrow-band noise around the engine pitch and its octave, never a pure tone.
    const engineNoise = this.noise(ctx, sources, generators);
    this.engineGain = new GainNode(ctx, { gain: z.engine * p.engine });
    for (const [mult, q, level] of [
      [1, 9, 1],
      [2, 12, 0.45],
    ] as const) {
      const band = new BiquadFilterNode(ctx, { type: 'bandpass', frequency: z.engineHz * mult, Q: q });
      engineNoise.connect(band).connect(new GainNode(ctx, { gain: level * 3 })).connect(this.engineGain);
    }
    this.engineGain.connect(out);
  }

  /** Optional focus tones: a quiet binaural pair under the cabin, felt more than heard (headphones only). */
  setFocusTones(on: boolean, purpose: TripPurpose = 'study') {
    const ctx = this.ctx;
    if (!ctx || !this.bed) return;
    if (!on) {
      const focus = this.focus;
      this.focus = null;
      if (focus) {
        focus.gain.gain.setTargetAtTime(0, ctx.currentTime, 1.5);
        setTimeout(focus.stop, 6000);
      }
      return;
    }
    if (this.focus) return;
    const beat = PURPOSE_BEAT_HZ[purpose] ?? 14;
    const merger = new ChannelMergerNode(ctx, { numberOfInputs: 2 });
    const left = new OscillatorNode(ctx, { frequency: FOCUS_CARRIER_HZ });
    const right = new OscillatorNode(ctx, { frequency: FOCUS_CARRIER_HZ + beat });
    left.connect(merger, 0, 0);
    right.connect(merger, 0, 1);
    const gain = new GainNode(ctx, { gain: 0 });
    merger.connect(gain).connect(this.bed);
    // Fade in over half a minute so it never draws attention.
    gain.gain.setTargetAtTime(FOCUS_LEVEL, ctx.currentTime + 1, 10);
    left.start();
    right.start();
    this.focus = {
      gain,
      stop: () => {
        left.stop();
        right.stop();
        gain.disconnect();
      },
    };
  }

  /** Focus mode: less low rumble. Remembered across flights; eases in over a couple of seconds. */
  setFocusMode(on: boolean) {
    this.focusMode = on;
    if (this.bassShelf && this.ctx) {
      this.bassShelf.gain.setTargetAtTime(on ? FOCUS_MODE_SHELF_DB : 0, this.ctx.currentTime, 0.8);
    }
  }

  setPhase(phase: FlightPhase) {
    this.phase = phase;
    const p = PHASES[phase];
    if (this.ctx) {
      const t = this.ctx.currentTime;
      this.toneFilter?.frequency.setTargetAtTime(this.toneBase * p.tone, t, 3);
      this.engineGain?.gain.setTargetAtTime(this.zone.engine * p.engine, t, 3);
    }
    this.rampBed(6);
  }

  setVolume(volume: number) {
    this.volume = volume;
    if (!this.ctx) return;
    for (const bus of [this.cabinBus, this.paBus]) bus?.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.1);
  }

  stop(fade = FADE_OUT) {
    if (!this.stopNodes || !this.ctx || !this.bed) return;
    const stop = this.stopNodes;
    this.stopNodes = null;
    this.bed.gain.setTargetAtTime(0, this.ctx.currentTime, Math.max(0.01, fade / 4));
    setTimeout(stop, fade * 1000 + 50);
  }

  /** Cabin PA chime: "single" for the seatbelt sign, "double" before an announcement. */
  chime(kind: 'single' | 'double') {
    const ctx = this.unlock();
    const out = new GainNode(ctx, { gain: 0.16 });
    out.connect(this.paBus!);
    const t = ctx.currentTime + 0.05;
    bell(ctx, out, 784, t); // G5
    if (kind === 'double') bell(ctx, out, 622, t + 0.55); // E♭5
    setTimeout(() => out.disconnect(), 4000);
  }

  /** A stereo noise source: live from the worklet, or a seamless crossfaded loop as a fallback. */
  private noise(
    ctx: AudioContext,
    sources: AudioScheduledSourceNode[],
    generators: AudioNode[],
    kind: 'pink' | 'white' = 'pink',
  ): AudioNode {
    if (this.workletReady) {
      const node = new AudioWorkletNode(ctx, `carry-on-${kind}-noise`, { numberOfInputs: 0, outputChannelCount: [2] });
      generators.push(node);
      return node;
    }
    const src = new AudioBufferSourceNode(ctx, { buffer: loopedNoise(ctx, FALLBACK_SECONDS, kind), loop: true });
    sources.push(src);
    return src;
  }

  private rampBed(seconds: number) {
    if (!this.bed || !this.ctx) return;
    const level = this.zone.level * this.cabinLevel * PHASES[this.phase].level;
    this.bed.gain.setTargetAtTime(level, this.ctx.currentTime, seconds / 3);
  }
}

/**
 * Noise in a buffer whose end flows into its start: the first second is crossfaded with
 * the noise that would have followed the last sample, so looping has no click or seam.
 */
function loopedNoise(ctx: AudioContext, seconds: number, kind: 'pink' | 'white'): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const fade = ctx.sampleRate;
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const raw = kind === 'pink' ? pinkSamples(length + fade) : whiteSamples(length + fade);
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      if (i < fade) {
        const t = i / fade;
        data[i] = raw[i] * Math.sin((t * Math.PI) / 2) + raw[length + i] * Math.cos((t * Math.PI) / 2);
      } else {
        data[i] = raw[i];
      }
    }
  }
  return buffer;
}

function whiteSamples(n: number): Float32Array {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = Math.random() * 2 - 1;
  return out;
}

function pinkSamples(n: number): Float32Array {
  const out = new Float32Array(n);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
  }
  return out;
}

/** A soft bell: fundamental plus two faint partials with a long decay. */
function bell(ctx: AudioContext, out: AudioNode, hz: number, at: number) {
  for (const [mult, level] of [
    [1, 1],
    [2, 0.18],
    [3, 0.06],
  ] as const) {
    const osc = new OscillatorNode(ctx, { frequency: hz * mult });
    const env = new GainNode(ctx, { gain: 0 });
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(level, at + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, at + 2.2);
    osc.connect(env).connect(out);
    osc.start(at);
    osc.stop(at + 2.3);
  }
}

export const cabinAudio = new CabinAudio();
