import { hashString } from './random';
import type { AircraftClass } from './types';

/**
 * Cabin timbre: the real aircraft whose sound the cabin noise is shaped after
 * (filters made from in-flight recordings by scripts/sound/make_cabin_ir.py).
 */
export type CabinTimbre = 'a320' | 'b737' | 'b777';

export const CABIN_TIMBRES: CabinTimbre[] = ['a320', 'b737', 'b777'];

/** Narrow-bodies sound like an A320 or a 737 (fixed per flight number); wide-bodies like a 777. */
export function timbreFor(aircraft: AircraftClass, flightNumber: string): CabinTimbre {
  if (aircraft !== 'narrowbody') return 'b777';
  return hashString(flightNumber) % 2 === 0 ? 'a320' : 'b737';
}
