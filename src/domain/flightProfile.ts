import type { AircraftClass } from './types';

export type FlightPhase = 'climb' | 'cruise' | 'descent';

export interface FlightState {
  phase: FlightPhase;
  altitudeFt: number;
  groundSpeedKmh: number;
  outsideTempC: number;
}

const CRUISE_ALT: Record<AircraftClass, number> = { narrowbody: 35_000, widebody: 38_000, longhaul: 40_000 };
const CRUISE_SPEED: Record<AircraftClass, number> = { narrowbody: 830, widebody: 880, longhaul: 900 };
const SCENIC_ALT = 6_000;
const SCENIC_SPEED = 320;

/** Climb takes up to 20 minutes and descent up to 25, but never most of a short flight. */
export function phaseBounds(plannedMinutes: number): { climbEnd: number; descentStart: number } {
  const climb = Math.min(20, plannedMinutes * 0.3) / plannedMinutes;
  const descent = Math.min(25, plannedMinutes * 0.35) / plannedMinutes;
  return { climbEnd: climb, descentStart: 1 - descent };
}

const ease = (t: number) => t * t * (3 - 2 * t);

/** Simulated in-flight data for the cabin screen, from progress 0..1. */
export function flightState(
  progress: number,
  plannedMinutes: number,
  aircraft: AircraftClass,
  scenic = false,
): FlightState {
  const { climbEnd, descentStart } = phaseBounds(plannedMinutes);
  const cruiseAlt = scenic ? SCENIC_ALT : CRUISE_ALT[aircraft];
  const cruiseSpeed = scenic ? SCENIC_SPEED : CRUISE_SPEED[aircraft];
  const groundSpeed = 260;

  let phase: FlightPhase;
  let k: number; // 0 on the ground, 1 at cruise
  if (progress < climbEnd) {
    phase = 'climb';
    k = ease(progress / climbEnd);
  } else if (progress < descentStart) {
    phase = 'cruise';
    k = 1;
  } else {
    phase = 'descent';
    k = ease(1 - (progress - descentStart) / (1 - descentStart));
  }

  const altitudeFt = Math.round((cruiseAlt * k) / 100) * 100;
  return {
    phase,
    altitudeFt,
    groundSpeedKmh: Math.round(groundSpeed + (cruiseSpeed - groundSpeed) * k),
    // International Standard Atmosphere: -1.98 °C per 1,000 ft, floor at the tropopause.
    outsideTempC: Math.round(Math.max(-56.5, 15 - (1.98 * altitudeFt) / 1000)),
  };
}
