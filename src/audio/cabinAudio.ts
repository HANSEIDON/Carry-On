import type { TripPurpose } from '../db/db';
import type { FlightPhase } from '../domain/flightProfile';
import type { CabinClass, SeatZone } from '../domain/seatmap';

/**
 * Cabin audio engine — procedural acoustics & scientifically tuned white/brown noise:
 *   1. Hull Rumble: Pure Brownian noise (1/f² decay via leaky integrator) — mimics the deep fuselage resonance.
 *   2. Cabin Airflow: Multi-pole pink noise (1/f) through a wide band-pass filter — gentle overhead HVAC air.
 *   3. Turbine Hum & Binaural Beat: Stereo engine tone subtly detuned to create a subliminal focus frequency
 *      (SMR 14Hz for study, Alpha 10Hz for reading, Gamma 40Hz for creative) camouflaged as a turbine hum.
 *
 * No external audio files are needed; runs infinitely without seams, clicks, or bandwidth cost.
 */

interface Mix {
  rumble: number;
  rumbleCutoff: number;
  air: number;
  airCutoff: number;
  hum: number;
  humHz: number;
}

const ZONE_MIX: Record<SeatZone, Mix> = {
  front: { rumble: 0.42, rumbleCutoff: 190, air: 0.55, airCutoff: 720, hum: 0.05, humHz: 114 },
  wing: { rumble: 0.88, rumbleCutoff: 150, air: 0.28, airCutoff: 620, hum: 0.12, humHz: 118 },
  rear: { rumble: 1.05, rumbleCutoff: 240, air: 0.35, airCutoff: 650, hum: 0.09, humHz: 122 },
};

/** Premium cabins have thicker sound insulation. */
const CABIN_LEVEL: Record<CabinClass, number> = { economy: 1, business: 0.82, first: 0.68 };

const PHASE_LEVEL: Record<FlightPhase, number> = { climb: 1.05, cruise: 0.9, descent: 0.75 };

/** Binaural beat offset (Hz) mapped to session purpose for brainwave entrainment. */
const PURPOSE_BEAT_HZ: Record<TripPurpose, number> = {
  study: 14, // SMR / Low-Beta: calm, sustained alertness
  work: 15, // Low-Beta: analytical focus & cognitive processing
  reading: 10, // Alpha: relaxed flow state & reduced cognitive fatigue
  creative: 40, // Gamma: peak cognition, working memory & creative synthesis
  other: 12, // Alpha-Beta bridge
};

const NOISE_BUFFER_SECONDS = 12;
const FADE_IN = 4;
const FADE_OUT = 1.5;

class CabinAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bed: GainNode | null = null;
  private stopNodes: (() => void) | null = null;
  private mix: Mix = ZONE_MIX.wing;
  private cabinLevel = 1;
  private phaseLevel = 1;
  private volume = 0.45;
  private rumbleFilter: BiquadFilterNode | null = null;

  /** Must run inside a user gesture (tap, key press) or browsers keep audio muted. */
  unlock(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.knee.value = 12;
      comp.ratio.value = 4;
      comp.attack.value = 0.02;
      comp.release.value = 0.25;

      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(comp).connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  /** The shared context and master bus, for other sounds (e.g. the ticket tear). Null until unlocked. */
  output(): { ctx: AudioContext; out: AudioNode } | null {
    return this.ctx && this.master ? { ctx: this.ctx, out: this.master } : null;
  }

  get needsGesture(): boolean {
    return !this.ctx || this.ctx.state !== 'running';
  }

  get playing(): boolean {
    return this.stopNodes !== null;
  }

  start(zone: SeatZone, cabin: CabinClass, phase: FlightPhase = 'climb', purpose: TripPurpose = 'study') {
    const ctx = this.unlock();
    this.stop(0);
    this.mix = ZONE_MIX[zone];
    this.cabinLevel = CABIN_LEVEL[cabin];
    this.phaseLevel = PHASE_LEVEL[phase];

    // 1. Hull Rumble: Brownian noise (1/f²) source
    const brownSource = ctx.createBufferSource();
    brownSource.buffer = brownianNoise(ctx, NOISE_BUFFER_SECONDS);
    brownSource.loop = true;

    // Warm multi-stage lowpass filter for deep fuselage body
    const lp1 = ctx.createBiquadFilter();
    lp1.type = 'lowpass';
    lp1.frequency.value = this.mix.rumbleCutoff;
    lp1.Q.value = 0.7;

    const lp2 = ctx.createBiquadFilter();
    lp2.type = 'lowpass';
    lp2.frequency.value = this.mix.rumbleCutoff * 1.8;

    const rumbleGain = ctx.createGain();
    rumbleGain.gain.value = this.mix.rumble * 3.2;

    brownSource.connect(lp1).connect(lp2).connect(rumbleGain);
    this.rumbleFilter = lp1;

    // 2. Cabin Airflow: Pink noise (1/f) through gentle air conditioning band-pass
    const pinkSource = ctx.createBufferSource();
    pinkSource.buffer = pinkNoise(ctx, NOISE_BUFFER_SECONDS);
    pinkSource.loop = true;

    const airBand = ctx.createBiquadFilter();
    airBand.type = 'bandpass';
    airBand.frequency.value = this.mix.airCutoff;
    airBand.Q.value = 0.55;

    const airGain = ctx.createGain();
    airGain.gain.value = this.mix.air * 2.2;

    pinkSource.connect(airBand).connect(airGain);

    // 3. Engine Turbine & Camouflaged Binaural Beat
    const baseHz = this.mix.humHz;
    const beatHz = PURPOSE_BEAT_HZ[purpose] ?? 14;

    // Left engine tone
    const humLeft = ctx.createOscillator();
    humLeft.type = 'sine';
    humLeft.frequency.value = baseHz;

    // Right engine tone (offset creates binaural beat)
    const humRight = ctx.createOscillator();
    humRight.type = 'sine';
    humRight.frequency.value = baseHz + beatHz;

    // Sub-harmonic body (gives jet engine depth, in mono)
    const subOsc = ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.value = baseHz * 0.5;

    const subGain = ctx.createGain();
    subGain.gain.value = 0.35;
    subOsc.connect(subGain);

    // Merge into stereo field
    const merger = ctx.createChannelMerger(2);
    humLeft.connect(merger, 0, 0); // left ear
    humRight.connect(merger, 0, 1); // right ear
    subGain.connect(merger, 0, 0);
    subGain.connect(merger, 0, 1);

    const turbineMaster = ctx.createGain();
    turbineMaster.gain.value = this.mix.hum * 0.85;

    // Slow ambient breathing LFO (0.07 Hz ~ 14s cycle)
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = this.mix.hum * 0.22;
    lfo.connect(lfoGain).connect(turbineMaster.gain);

    merger.connect(turbineMaster);

    // Master cabin bed
    this.bed = ctx.createGain();
    this.bed.gain.value = 0;

    rumbleGain.connect(this.bed);
    airGain.connect(this.bed);
    turbineMaster.connect(this.bed);
    this.bed.connect(this.master!);

    brownSource.start();
    pinkSource.start();
    humLeft.start();
    humRight.start();
    subOsc.start();
    lfo.start();

    this.rampBed(FADE_IN);

    const bed = this.bed;
    this.stopNodes = () => {
      brownSource.stop();
      pinkSource.stop();
      humLeft.stop();
      humRight.stop();
      subOsc.stop();
      lfo.stop();
      bed.disconnect();
    };
  }

  setPhase(phase: FlightPhase) {
    this.phaseLevel = PHASE_LEVEL[phase];
    if (this.rumbleFilter && this.ctx) {
      // Engines spool up in the climb: deeper low-end presence
      const cutoff = this.mix.rumbleCutoff * (phase === 'climb' ? 1.25 : 1);
      this.rumbleFilter.frequency.setTargetAtTime(cutoff, this.ctx.currentTime, 2.5);
    }
    this.rampBed(6);
  }

  setVolume(volume: number) {
    this.volume = volume;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.1);
  }

  /** Announcements play over the cabin noise at full level, as on a real flight; kept as a no-op hook. */
  duck(_on: boolean) {}

  stop(fade = FADE_OUT) {
    if (!this.stopNodes || !this.ctx || !this.bed) return;
    const stop = this.stopNodes;
    this.stopNodes = null;
    this.bed.gain.setTargetAtTime(0, this.ctx.currentTime, fade / 4);
    setTimeout(stop, fade * 1000 + 50);
  }

  /** Cabin PA chime: "single" for the seatbelt sign, "double" before an announcement. */
  chime(kind: 'single' | 'double') {
    const ctx = this.unlock();
    const out = ctx.createGain();
    out.gain.value = 0.22;
    out.connect(this.master!);
    const t = ctx.currentTime + 0.05;
    bell(ctx, out, 784, t); // G5
    if (kind === 'double') bell(ctx, out, 622, t + 0.55); // E♭5
    setTimeout(() => out.disconnect(), 4000);
  }

  private rampBed(seconds: number) {
    if (!this.bed || !this.ctx) return;
    const level = this.cabinLevel * this.phaseLevel;
    this.bed.gain.setTargetAtTime(level, this.ctx.currentTime, seconds / 3);
  }
}

/**
 * Brownian (Red) noise generator: 1/f² power decay.
 * Synthesizes deep, velvet-textured low rumble via leaky integrator.
 */
function brownianNoise(ctx: AudioContext, seconds: number): AudioBuffer {
  const buffer = ctx.createBuffer(2, ctx.sampleRate * seconds, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.8;
    }
  }
  return buffer;
}

/**
 * Pink noise generator: 1/f power decay (Paul Kellet's refined 7-pole filter).
 * Provides gentle, smooth airflow with zero harsh high-frequency hiss.
 */
function pinkNoise(ctx: AudioContext, seconds: number): AudioBuffer {
  const buffer = ctx.createBuffer(2, ctx.sampleRate * seconds, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  }
  return buffer;
}

/** A soft bell: fundamental plus two faint partials with a long decay. */
function bell(ctx: AudioContext, out: AudioNode, hz: number, at: number) {
  for (const [mult, level] of [
    [1, 1],
    [2, 0.18],
    [3, 0.06],
  ] as const) {
    const osc = ctx.createOscillator();
    osc.frequency.value = hz * mult;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(level, at + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, at + 2.2);
    osc.connect(env).connect(out);
    osc.start(at);
    osc.stop(at + 2.3);
  }
}

export const cabinAudio = new CabinAudio();
