import Dexie, { type EntityTable } from 'dexie';
import { DEFAULT_HOME_CODE } from '../data/cities';

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

export interface Flight {
  id: string;
  fromCode: string;
  /** Same as fromCode for scenic flights. */
  toCode: string;
  scenic: boolean;
  plannedMinutes: number;
  seat: string;
  startedAt: number;
  endedAt?: number;
  status: FlightStatus;
  miles: number;
}

export type StickerKind = 'bag_tag' | 'priority' | 'security' | 'transfer' | 'fragile' | 'heavy';

export interface Sticker {
  id: string;
  carrierId: string;
  flightId: string;
  kind: StickerKind;
  /** Destination airport code printed on the sticker. */
  code: string;
  appliedAt: number;
}

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
  color: '#2B2E33',
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
