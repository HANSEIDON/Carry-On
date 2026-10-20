import type { FlightPhase } from '../domain/flightProfile';
import type { CabinClass, SeatZone } from '../domain/seatmap';

/**
 * Cabin white noise, synthesized live (no audio files, loops forever without a seam):
 *   rumble  low-passed noise — the body of the engine sound
 *   air     band-passed noise — airflow along the fuselage
 *   hum     a soft low tone that slowly breathes — engine fan
 * The seat zone sets the mix; the flight phase nudges it (louder in climb, softer in descent).
 */

interface Mix {
  rumble: number;
  rumbleCutoff: number;
  air: number;
  hum: number;
  humHz: number;
}

const ZONE_MIX: Record<SeatZone, Mix> = {
  front: { rumble: 0.55, rumbleCutoff: 230, air: 0.42, hum: 0.04, humHz: 96 },
  wing: { rumble: 0.85, rumbleCutoff: 160, air: 0.22, hum: 0.14, humHz: 82 },
  rear: { rumble: 1.0, rumbleCutoff: 280, air: 0.3, hum: 0.1, humHz: 112 },
};

/** Premium cabins are better insulated. */
const CABIN_LEVEL: Record<CabinClass, number> = { economy: 1, business: 0.82, first: 0.7 };

const PHASE_LEVEL: Record<FlightPhase, number> = { climb: 1.2, cruise: 1, descent: 0.85 };

const NOISE_SECONDS = 8;
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
  private volume = 0.6;
  private ducked = false;
  private rumbleFilter: BiquadFilterNode | null = null;

  /** Must run inside a user gesture (tap, key press) or browsers keep audio muted. */
  unlock(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      const comp = this.ctx.createDynamicsCompressor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(comp).connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  get needsGesture(): boolean {
    return !this.ctx || this.ctx.state !== 'running';
  }

  get playing(): boolean {
    return this.stopNodes !== null;
  }

  start(zone: SeatZone, cabin: CabinClass, phase: FlightPhase = 'climb') {
    const ctx = this.unlock();
    this.stop(0);
    this.mix = ZONE_MIX[zone];
    this.cabinLevel = CABIN_LEVEL[cabin];
    this.phaseLevel = PHASE_LEVEL[phase];

    const noise = ctx.createBufferSource();
    noise.buffer = whiteNoise(ctx, NOISE_SECONDS);
    noise.loop = true;

    // Rumble: two stacked low-passes for a steep, warm roll-off, plus make-up gain.
    const lp1 = ctx.createBiquadFilter();
    lp1.type = 'lowpass';
    lp1.frequency.value = this.mix.rumbleCutoff;
    const lp2 = ctx.createBiquadFilter();
    lp2.type = 'lowpass';
    lp2.frequency.value = this.mix.rumbleCutoff * 1.6;
    const rumble = ctx.createGain();
    rumble.gain.value = this.mix.rumble * 7;
    noise.connect(lp1).connect(lp2).connect(rumble);
    this.rumbleFilter = lp1;

    // Air: the hiss of the airflow.
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 900;
    const lp3 = ctx.createBiquadFilter();
    lp3.type = 'lowpass';
    lp3.frequency.value = 3800;
    const air = ctx.createGain();
    air.gain.value = this.mix.air * 1.4;
    noise.connect(hp).connect(lp3).connect(air);

    // Hum: a low tone whose level drifts very slowly.
    const hum = ctx.createOscillator();
    hum.frequency.value = this.mix.humHz;
    const humGain = ctx.createGain();
    humGain.gain.value = this.mix.hum;
    const drift = ctx.createOscillator();
    drift.frequency.value = 0.06;
    const driftDepth = ctx.createGain();
    driftDepth.gain.value = this.mix.hum * 0.35;
    drift.connect(driftDepth).connect(humGain.gain);
    hum.connect(humGain);

    this.bed = ctx.createGain();
    this.bed.gain.value = 0;
    rumble.connect(this.bed);
    air.connect(this.bed);
    humGain.connect(this.bed);
    this.bed.connect(this.master!);

    noise.start();
    hum.start();
    drift.start();
    this.rampBed(FADE_IN);

    const bed = this.bed;
    this.stopNodes = () => {
      noise.stop();
      hum.stop();
      drift.stop();
      bed.disconnect();
    };
  }

  setPhase(phase: FlightPhase) {
    this.phaseLevel = PHASE_LEVEL[phase];
    if (this.rumbleFilter && this.ctx) {
      // Engines spool up in the climb: the rumble gets a little brighter.
      const cutoff = this.mix.rumbleCutoff * (phase === 'climb' ? 1.25 : 1);
      this.rumbleFilter.frequency.setTargetAtTime(cutoff, this.ctx.currentTime, 2);
    }
    this.rampBed(6);
  }

  setVolume(volume: number) {
    this.volume = volume;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.1);
  }

  /** Lower the cabin noise while an announcement plays. */
  duck(on: boolean) {
    this.ducked = on;
    this.rampBed(0.6);
  }

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
    const level = this.cabinLevel * this.phaseLevel * (this.ducked ? 0.45 : 1);
    this.bed.gain.setTargetAtTime(level, this.ctx.currentTime, seconds / 3);
  }
}

function whiteNoise(ctx: AudioContext, seconds: number): AudioBuffer {
  const buffer = ctx.createBuffer(2, ctx.sampleRate * seconds, ctx.sampleRate);
  // Independent channels give the noise a wide, enveloping feel.
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
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
