import Dexie, { type EntityTable } from 'dexie';
import { carrierType, STARTER_CARRIER_ID } from '../data/carriers';
import { DEFAULT_HOME_CODE } from '../data/cities';
import { fillReward, shopState } from '../domain/carrierShop';
import { stickerArt, type StickerArt } from '../domain/stickerArt';
import type { FlightPlan } from '../domain/flightPlan';
import { earnedMiles, stickersForLanding, type StickerKind } from '../domain/landing';
import type { CabinClass, SeatZone } from '../domain/seatmap';
import { tierFor } from '../domain/tier';
import type { Tier } from '../domain/types';

export interface Profile {
  id: 'me';
  /** Given names: the greeting and the passport use them. */
  name: string;
  /** Set on the passport page; optional. */
  surname?: string;
  /** ISO 3166-1 alpha-2; until set, the passport uses the home city's country. */
  nationality?: string;
  /** Passport photo: a small JPEG data URL. */
  photo?: string;
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
  /** Carrier type, as in src/data/carriers.ts ("001"…"030"). */
  modelId: string;
  color: string;
  /** As when it was made; the type's own capacity (its sticker spots) is what counts. */
  capacity: number;
  acquiredAt: number;
  /** Which of your carriers of this type it is: 1 the first, 2 the fresh one after filling that… */
  copy?: number;
  /** When its last sticker spot was taken: it's kept as it is, and a fresh one took its place. */
  filledAt?: number;
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

// v2: carriers name their type; the old 2D placeholder becomes the Starter Shell.
db.version(2)
  .stores({ carriers: 'id, acquiredAt, modelId' })
  .upgrade((tx) =>
    tx
      .table('carriers')
      .toCollection()
      .modify((c: Carrier) => {
        if (c.modelId === 'placeholder') c.modelId = STARTER_CARRIER_ID;
      }),
  );

const STARTER_CARRIER: Omit<Carrier, 'id' | 'acquiredAt'> = {
  modelId: STARTER_CARRIER_ID,
  color: '#2c3b55',
  capacity: carrierType(STARTER_CARRIER_ID).capacity,
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

/** Saves passport details (name, nationality, photo) the traveler edits. */
export async function updateProfile(patch: Partial<Pick<Profile, 'name' | 'surname' | 'nationality' | 'photo'>>): Promise<Profile> {
  return db.transaction('rw', db.profile, async () => {
    const profile = (await db.profile.get('me'))!;
    const updated = { ...profile, ...patch };
    await db.profile.put(updated);
    return updated;
  });
}

/** Every flight, oldest first (for the passport). */
export function listFlights(): Promise<Flight[]> {
  return db.flights.orderBy('startedAt').toArray();
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

/** A carrier that filled up on landing, the fresh one packed in its place, and the miles it paid. */
export interface FilledCarrier {
  carrier: Carrier;
  fresh: Carrier;
  bonus: number;
  /** The first time you filled this kind (the bonus is doubled). */
  first: boolean;
}

export interface LandingResult {
  flight: Flight;
  profile: Profile;
  stickers: Sticker[];
  /** Usually empty; one when this landing took the last spot. */
  filled: FilledCarrier[];
}

/**
 * Lands the flight: credits miles, moves the traveler, and sticks tags on the active carrier. A
 * carrier whose spots are all taken is kept as it is; a fresh one of the same kind takes over, and
 * filling it pays miles (`fillReward`).
 */
export async function landFlight(flightId: string): Promise<LandingResult> {
  return db.transaction('rw', [db.flights, db.profile, db.stickers, db.carriers], async () => {
    const flight = await db.flights.get(flightId);
    const profile = await db.profile.get('me');
    if (!flight || !profile) throw new Error('flight or profile missing');
    if (flight.status !== 'in_flight') throw new Error(`flight already ${flight.status}`);

    const tier = tierFor(profile.lifetimeMiles);
    const miles = earnedMiles(flight.miles, tier);
    const now = Date.now();

    const landed: Flight = { ...flight, status: 'landed', endedAt: now, earnedMiles: miles };
    let carrier = (await db.carriers.get(profile.activeCarrierId))!;
    let on = await db.stickers.where('carrierId').equals(carrier.id).count();
    let bonus = 0;
    const stickers: Sticker[] = [];
    const filled: FilledCarrier[] = [];
    for (const kind of stickersForLanding(flight.cabin, tier, { id: flight.id, minutes: flight.plannedMinutes })) {
      stickers.push({ id: crypto.randomUUID(), carrierId: carrier.id, flightId: flight.id, kind, code: flight.toCode, appliedAt: now });
      on++;
      const capacity = carrierType(carrier.modelId).capacity;
      if (capacity > 0 && on >= capacity) {
        const kin = await db.carriers.where('modelId').equals(carrier.modelId).toArray();
        const first = !kin.some((c) => c.filledAt);
        const done: Carrier = { ...carrier, filledAt: now };
        const fresh: Carrier = {
          id: crypto.randomUUID(),
          modelId: carrier.modelId,
          color: carrier.color,
          capacity,
          acquiredAt: now + 1,
          copy: Math.max(...kin.map((c) => c.copy ?? 1)) + 1,
        };
        const reward = fillReward(capacity, first);
        await db.carriers.put(done);
        await db.carriers.add(fresh);
        filled.push({ carrier: done, fresh, bonus: reward, first });
        bonus += reward;
        carrier = fresh;
        on = 0;
      }
    }
    const updated: Profile = {
      ...profile,
      currentCityCode: flight.toCode,
      // The fill bonus is spendable; tier progress is what you flew.
      miles: profile.miles + miles + bonus,
      lifetimeMiles: profile.lifetimeMiles + miles,
      activeCarrierId: carrier.id,
    };

    await db.flights.put(landed);
    await db.profile.put(updated);
    await db.stickers.bulkAdd(stickers);
    return { flight: landed, profile: updated, stickers, filled };
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

/** The stickers on a carrier, with the flight each came from (what's printed on it). */
export async function stickersOn(carrierId: string): Promise<StickerArt[]> {
  const stickers = await db.stickers.where('carrierId').equals(carrierId).sortBy('appliedAt');
  const flights = await db.flights.bulkGet(stickers.map((s) => s.flightId));
  return stickers.map((s, i) => stickerArt(s, flights[i]));
}

/** Carriers you own, oldest first, with how many stickers each carries. */
export async function listCarriers(): Promise<(Carrier & { stickers: number })[]> {
  const carriers = await db.carriers.orderBy('acquiredAt').toArray();
  return Promise.all(carriers.map(async (c) => ({ ...c, stickers: await countStickers(c.id) })));
}

/** Buys a carrier in Duty Free with spendable miles. One of each type. */
export async function buyCarrier(typeId: string, tier: Tier): Promise<{ profile: Profile; carrier: Carrier }> {
  return db.transaction('rw', db.profile, db.carriers, async () => {
    const profile = (await db.profile.get('me'))!;
    const type = carrierType(typeId);
    if (type.id !== typeId) throw new Error('unknown carrier');
    if ((await db.carriers.where('modelId').equals(typeId).count()) > 0) throw new Error('already owned');
    const state = shopState(type, { owned: false, tier, miles: profile.miles });
    if (state.kind !== 'buyable') throw new Error(`cannot buy: ${state.kind}`);
    const carrier: Carrier = {
      id: crypto.randomUUID(),
      modelId: typeId,
      color: '',
      capacity: type.capacity,
      acquiredAt: Date.now(),
    };
    const updated: Profile = { ...profile, miles: profile.miles - type.price };
    await db.carriers.add(carrier);
    await db.profile.put(updated);
    return { profile: updated, carrier };
  });
}

/** The carrier new stickers go on, and the one on the home screen. */
export async function setActiveCarrier(carrierId: string): Promise<Profile> {
  return db.transaction('rw', db.profile, db.carriers, async () => {
    if (!(await db.carriers.get(carrierId))) throw new Error('carrier missing');
    const profile = (await db.profile.get('me'))!;
    const updated = { ...profile, activeCarrierId: carrierId };
    await db.profile.put(updated);
    return updated;
  });
}

/** Development only: spendable miles to try the shop with (lifetime miles and tier stay). */
export async function addMilesForTesting(miles: number): Promise<Profile> {
  return db.transaction('rw', db.profile, async () => {
    const profile = (await db.profile.get('me'))!;
    const updated = { ...profile, miles: profile.miles + miles };
    await db.profile.put(updated);
    return updated;
  });
}
