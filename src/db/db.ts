import Dexie, { type EntityTable } from 'dexie';
import { DEFAULT_HOME_CODE } from '../data/cities';
import type { FlightPlan } from '../domain/flightPlan';
import { earnedMiles, stickersForLanding, type StickerKind } from '../domain/landing';
import type { CabinClass, SeatZone } from '../domain/seatmap';
import { tierFor } from '../domain/tier';

export interface Profile {
  id: 'me';
  name: string;
  currentCityCode: string;
  /** Spendable miles. */
  miles: number;
  /** Never decreases; drives the membership tier. */
  lifetimeMiles: number;
  activeCarrierId: string;
  createdAt: number;
}

export interface Carrier {
  id: string;
  /** 3D base model id. "placeholder" until real models land (phase 2). */
  modelId: string;
  color: string;
  capacity: number;
  acquiredAt: number;
}

export type FlightStatus = 'in_flight' | 'landed' | 'diverted';

export type TripPurpose = 'study' | 'work' | 'reading' | 'creative' | 'other';

export interface Flight {
  id: string;
  fromCode: string;
  /** Same as fromCode for scenic flights. */
  toCode: string;
  scenic: boolean;
  airlineCode: string;
  flightNumber: string;
  gate: string;
  seat: string;
  cabin: CabinClass;
  /** Where the seat is along the cabin; sets the noise mix. Missing on early test flights. */
  zone?: SeatZone;
  purpose: TripPurpose;
  plannedMinutes: number;
  startedAt: number;
  endedAt?: number;
  status: FlightStatus;
  /** Base route miles; the tier bonus is applied on landing. */
  miles: number;
  /** Miles actually credited (0 when diverted). */
  earnedMiles?: number;
}

export interface Sticker {
  id: string;
  carrierId: string;
  flightId: string;
  kind: StickerKind;
  /** Destination airport code printed on the sticker. */
  code: string;
  appliedAt: number;
}

export type { StickerKind };

export const db = new Dexie('carry-on') as Dexie & {
  profile: EntityTable<Profile, 'id'>;
  carriers: EntityTable<Carrier, 'id'>;
  flights: EntityTable<Flight, 'id'>;
  stickers: EntityTable<Sticker, 'id'>;
};

db.version(1).stores({
  profile: 'id',
  carriers: 'id, acquiredAt',
  flights: 'id, startedAt, status',
  stickers: 'id, carrierId, flightId, appliedAt',
});

const STARTER_CARRIER: Omit<Carrier, 'id' | 'acquiredAt'> = {
  modelId: 'placeholder',
  color: '#2c3b55',
  capacity: 24,
};

/** Loads the local profile, creating it with a free starter carrier on first launch. */
export async function loadOrCreateProfile(): Promise<Profile> {
  return db.transaction('rw', db.profile, db.carriers, async () => {
    const existing = await db.profile.get('me');
    if (existing) return existing;

    const now = Date.now();
    const carrier: Carrier = { ...STARTER_CARRIER, id: crypto.randomUUID(), acquiredAt: now };
    const profile: Profile = {
      id: 'me',
      name: 'Traveler',
      currentCityCode: DEFAULT_HOME_CODE,
      miles: 0,
      lifetimeMiles: 0,
      activeCarrierId: carrier.id,
      createdAt: now,
    };
    await db.carriers.add(carrier);
    await db.profile.add(profile);
    return profile;
  });
}

export async function startFlight(
  plan: FlightPlan,
  seat: { id: string; cabin: CabinClass; zone: SeatZone },
  purpose: TripPurpose,
): Promise<Flight> {
  const flight: Flight = {
    id: crypto.randomUUID(),
    fromCode: plan.fromCode,
    toCode: plan.toCode,
    scenic: plan.scenic,
    airlineCode: plan.airline.code,
    flightNumber: plan.flightNumber,
    gate: plan.gate,
    seat: seat.id,
    cabin: seat.cabin,
    zone: seat.zone,
    purpose,
    plannedMinutes: plan.minutes,
    startedAt: Date.now(),
    status: 'in_flight',
    miles: plan.miles,
  };
  await db.flights.add(flight);
  return flight;
}

export async function getActiveFlight(): Promise<Flight | undefined> {
  return db.flights.where('status').equals('in_flight').first();
}

export interface LandingResult {
  flight: Flight;
  profile: Profile;
  stickers: Sticker[];
}

/** Lands the flight: credits miles, moves the traveler, and sticks tags on the active carrier. */
export async function landFlight(flightId: string): Promise<LandingResult> {
  return db.transaction('rw', db.flights, db.profile, db.stickers, async () => {
    const flight = await db.flights.get(flightId);
    const profile = await db.profile.get('me');
    if (!flight || !profile) throw new Error('flight or profile missing');
    if (flight.status !== 'in_flight') throw new Error(`flight already ${flight.status}`);

    const tier = tierFor(profile.lifetimeMiles);
    const miles = earnedMiles(flight.miles, tier);
    const now = Date.now();

    const landed: Flight = { ...flight, status: 'landed', endedAt: now, earnedMiles: miles };
    const updated: Profile = {
      ...profile,
      currentCityCode: flight.toCode,
      miles: profile.miles + miles,
      lifetimeMiles: profile.lifetimeMiles + miles,
    };
    const stickers: Sticker[] = stickersForLanding(flight.cabin, tier).map((kind) => ({
      id: crypto.randomUUID(),
      carrierId: profile.activeCarrierId,
      flightId: flight.id,
      kind,
      code: flight.toCode,
      appliedAt: now,
    }));

    await db.flights.put(landed);
    await db.profile.put(updated);
    await db.stickers.bulkAdd(stickers);
    return { flight: landed, profile: updated, stickers };
  });
}

/** Ends the flight without reward (gave up, or strict mode tripped). */
export async function divertFlight(flightId: string): Promise<Flight> {
  const flight = await db.flights.get(flightId);
  if (!flight) throw new Error('flight missing');
  const diverted: Flight = { ...flight, status: 'diverted', endedAt: Date.now(), earnedMiles: 0 };
  await db.flights.put(diverted);
  return diverted;
}

export async function countStickers(carrierId: string): Promise<number> {
  return db.stickers.where('carrierId').equals(carrierId).count();
}
