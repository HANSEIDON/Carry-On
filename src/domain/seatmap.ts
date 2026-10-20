import { seededRandom } from './random';
import type { AircraftClass, Tier } from './types';

export type CabinClass = 'first' | 'business' | 'economy';

/** Where the seat sits along the fuselage; drives the cabin noise character. */
export type SeatZone = 'front' | 'wing' | 'rear';

export interface Seat {
  id: string;
  row: number;
  letter: string;
  cabin: CabinClass;
  window: boolean;
  aisle: boolean;
  exit: boolean;
  zone: SeatZone;
  occupied: boolean;
}

export interface CabinLayout {
  cabin: CabinClass;
  firstRow: number;
  lastRow: number;
  /** Seat letters left to right; null is an aisle. */
  columns: (string | null)[];
  exitRows?: number[];
}

export interface SeatMap {
  cabins: CabinLayout[];
  seats: Seat[];
  /** Row numbers that sit over the wing, for drawing the wings. */
  wingRows: number[];
}

const col = (s: string) => s.split('').map((c) => (c === '|' ? null : c));

/** Simplified real-world configurations per aircraft class. */
const LAYOUTS: Record<AircraftClass, CabinLayout[]> = {
  // A320 / 737 family
  narrowbody: [
    { cabin: 'business', firstRow: 1, lastRow: 3, columns: col('AC|DF') },
    { cabin: 'economy', firstRow: 10, lastRow: 32, columns: col('ABC|DEF'), exitRows: [14, 15] },
  ],
  // 787 / A330 class
  widebody: [
    { cabin: 'business', firstRow: 1, lastRow: 6, columns: col('AC|DG|HK') },
    { cabin: 'economy', firstRow: 20, lastRow: 46, columns: col('ABC|DEF|HJK'), exitRows: [20, 32] },
  ],
  // A350 / 777 class
  longhaul: [
    { cabin: 'first', firstRow: 1, lastRow: 2, columns: col('A|E|K') },
    { cabin: 'business', firstRow: 5, lastRow: 12, columns: col('A|DG|K') },
    { cabin: 'economy', firstRow: 30, lastRow: 58, columns: col('ABC|DEF|HJK'), exitRows: [30, 43] },
  ],
};

const OCCUPANCY = 0.45;

/** Builds the seat map; `seed` keeps taken seats stable for a given flight. */
export function buildSeatMap(aircraft: AircraftClass, seed: number): SeatMap {
  const cabins = LAYOUTS[aircraft];
  const rand = seededRandom(seed);
  const allRows = cabins.flatMap((c) => range(c.firstRow, c.lastRow));
  const zoneOf = (row: number): SeatZone => {
    const frac = allRows.indexOf(row) / (allRows.length - 1);
    if (frac < 0.35) return 'front';
    if (frac < 0.7) return 'wing';
    return 'rear';
  };

  const seats: Seat[] = [];
  for (const c of cabins) {
    const letters = c.columns;
    for (const row of range(c.firstRow, c.lastRow)) {
      letters.forEach((letter, i) => {
        if (!letter) return;
        seats.push({
          id: `${row}${letter}`,
          row,
          letter,
          cabin: c.cabin,
          window: i === 0 || i === letters.length - 1,
          aisle: letters[i - 1] === null || letters[i + 1] === null,
          exit: c.exitRows?.includes(row) ?? false,
          zone: zoneOf(row),
          occupied: rand() < OCCUPANCY,
        });
      });
    }
  }

  return { cabins, seats, wingRows: allRows.filter((r) => zoneOf(r) === 'wing') };
}

/** Business opens at Silver, First at Platinum (docs/SPEC.md §8). */
export function cabinUnlocked(cabin: CabinClass, tier: Tier): boolean {
  if (cabin === 'economy') return true;
  if (cabin === 'business') return tier !== 'basic';
  return tier === 'platinum';
}

export function canPick(seat: Seat, tier: Tier): boolean {
  return !seat.occupied && cabinUnlocked(seat.cabin, tier);
}

/** "Assign a seat for me": a free window seat in the best cabin the tier allows. */
export function autoAssign(map: SeatMap, tier: Tier, rand: () => number = Math.random): Seat | null {
  const order: CabinClass[] = ['first', 'business', 'economy'];
  for (const cabin of order) {
    const free = map.seats.filter((s) => s.cabin === cabin && canPick(s, tier));
    if (free.length === 0) continue;
    const windows = free.filter((s) => s.window);
    const pool = windows.length > 0 ? windows : free;
    return pool[Math.floor(rand() * pool.length)];
  }
  return null;
}

export const ZONE_LABEL: Record<SeatZone, { place: string; sound: string }> = {
  front: { place: 'Front cabin', sound: 'Soft airflow' },
  wing: { place: 'Over the wing', sound: 'Deep engine hum' },
  rear: { place: 'Rear cabin', sound: 'Strong engine roar' },
};

export function seatPosition(seat: Seat): string {
  return seat.window ? 'Window' : seat.aisle ? 'Aisle' : 'Middle';
}

export const CABIN_LABEL: Record<CabinClass, string> = {
  first: 'First',
  business: 'Business',
  economy: 'Economy',
};

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}
