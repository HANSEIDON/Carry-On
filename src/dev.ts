import { db, type Carrier, type Flight, type Profile, type Sticker } from './db/db';
import { cityByCode } from './data/cities';
import { planRoute } from './domain/flightPlan';
import { autoAssign, buildSeatMap } from './domain/seatmap';
import type { Screen } from './store/appStore';
import { useSettings } from './store/settings';
import type { Tier } from './domain/types';

/**
 * Dev URL switches:
 *   ?tier=gold      preview a membership tier's design
 *   ?speed=60       run flights 60x faster to test landing
 *   ?bake-carriers  bake card pictures and sticker spots from the models
 *   ?screen=...     jump directly to a screen (fly, booking, checkin, boarding, passport, luggage, dutyfree)
 *   ?mock=1         seed rich profile, landed flights, and stickers for showcase screenshots
 */
const params = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();

const TIERS: Tier[] = ['basic', 'silver', 'gold', 'platinum'];

export const DEV_TIER: Tier | null = TIERS.find((t) => t === params.get('tier')) ?? null;

export const TIME_SCALE: number = Math.max(1, Number(params.get('speed')) || 1);

export const BAKE_CARRIERS: boolean = params.has('bake-carriers');

export const DEV_SCREEN: Screen | null = (params.get('screen') as Screen) || null;

export const SEED_MOCK: boolean = params.has('mock');

export async function seedMockData(): Promise<void> {
  const now = Date.now();
  const carrierId = 'dev-carrier-1';

  // Suppress all first-run guides and coach tutorials during screenshots
  useSettings.setState({
    guideSeen: true,
    bookingGuideSeen: true,
    tipShownAt: now + 1e11,
    tipsSeen: ['all'],
  });

  const profile: Profile = {
    id: 'me',
    name: 'Hanseidon',
    surname: 'Han',
    nationality: 'KR',
    currentCityCode: 'ICN',
    miles: 8450,
    lifetimeMiles: 16800,
    activeCarrierId: carrierId,
    createdAt: now - 30 * 86400000,
  };
  await db.profile.put(profile);

  const carriers: Carrier[] = [
    {
      id: carrierId,
      modelId: '001',
      color: '',
      capacity: 12,
      acquiredAt: now - 30 * 86400000,
    },
    {
      id: 'dev-carrier-2',
      modelId: '002',
      color: '',
      capacity: 14,
      acquiredAt: now - 15 * 86400000,
    },
    {
      id: 'dev-carrier-3',
      modelId: '003',
      color: '',
      capacity: 10,
      acquiredAt: now - 5 * 86400000,
    },
  ];
  for (const c of carriers) await db.carriers.put(c);

  const landedFlights: Flight[] = [
    { id: 'f1', fromCode: 'ICN', toCode: 'HND', scenic: false, airlineCode: 'HN', flightNumber: 'HN474', gate: '12B', seat: '14A', cabin: 'economy', zone: 'wing', purpose: 'work', plannedMinutes: 120, startedAt: now - 10 * 86400000, endedAt: now - 10 * 86400000 + 7200000, status: 'landed', miles: 750, earnedMiles: 900 },
    { id: 'f2', fromCode: 'HND', toCode: 'CDG', scenic: false, airlineCode: 'AF', flightNumber: 'AF275', gate: '44', seat: '2A', cabin: 'first', zone: 'front', purpose: 'reading', plannedMinutes: 720, startedAt: now - 8 * 86400000, endedAt: now - 8 * 86400000 + 43200000, status: 'landed', miles: 6050, earnedMiles: 7260 },
    { id: 'f3', fromCode: 'CDG', toCode: 'JFK', scenic: false, airlineCode: 'DL', flightNumber: 'DL401', gate: '21', seat: '7K', cabin: 'business', zone: 'front', purpose: 'study', plannedMinutes: 480, startedAt: now - 6 * 86400000, endedAt: now - 6 * 86400000 + 28800000, status: 'landed', miles: 3630, earnedMiles: 4350 },
    { id: 'f4', fromCode: 'JFK', toCode: 'LHR', scenic: false, airlineCode: 'BA', flightNumber: 'BA112', gate: '8', seat: '12B', cabin: 'economy', zone: 'wing', purpose: 'work', plannedMinutes: 420, startedAt: now - 4 * 86400000, endedAt: now - 4 * 86400000 + 25200000, status: 'landed', miles: 3450, earnedMiles: 4140 },
    { id: 'f5', fromCode: 'LHR', toCode: 'SIN', scenic: false, airlineCode: 'SQ', flightNumber: 'SQ319', gate: '15', seat: '18A', cabin: 'economy', zone: 'rear', purpose: 'creative', plannedMinutes: 780, startedAt: now - 2 * 86400000, endedAt: now - 2 * 86400000 + 46800000, status: 'landed', miles: 6760, earnedMiles: 8110 },
    { id: 'f6', fromCode: 'SIN', toCode: 'ICN', scenic: false, airlineCode: 'HN', flightNumber: 'HN642', gate: '3', seat: '15F', cabin: 'economy', zone: 'wing', purpose: 'work', plannedMinutes: 380, startedAt: now - 86400000, endedAt: now - 86400000 + 22800000, status: 'landed', miles: 2890, earnedMiles: 3460 },
  ];
  for (const f of landedFlights) await db.flights.put(f);

  const stickers: Sticker[] = [
    { id: 's1', carrierId: 'dev-carrier-2', flightId: 'f1', kind: 'bag_tag', code: 'HND', appliedAt: now - 10 * 86400000 },
    { id: 's2', carrierId: 'dev-carrier-2', flightId: 'f1', kind: 'priority', code: 'HND', appliedAt: now - 10 * 86400000 },
    { id: 's3', carrierId: 'dev-carrier-2', flightId: 'f2', kind: 'bag_tag', code: 'CDG', appliedAt: now - 8 * 86400000 },
    { id: 's4', carrierId: 'dev-carrier-2', flightId: 'f2', kind: 'fragile', code: 'CDG', appliedAt: now - 8 * 86400000 },
    { id: 's5', carrierId: 'dev-carrier-2', flightId: 'f3', kind: 'bag_tag', code: 'JFK', appliedAt: now - 6 * 86400000 },
    { id: 's6', carrierId: 'dev-carrier-2', flightId: 'f3', kind: 'security', code: 'JFK', appliedAt: now - 6 * 86400000 },
    { id: 's7', carrierId: 'dev-carrier-2', flightId: 'f4', kind: 'bag_tag', code: 'LHR', appliedAt: now - 4 * 86400000 },
    { id: 's8', carrierId: 'dev-carrier-2', flightId: 'f5', kind: 'bag_tag', code: 'SIN', appliedAt: now - 2 * 86400000 },
    { id: 's9', carrierId: 'dev-carrier-2', flightId: 'f5', kind: 'heavy', code: 'SIN', appliedAt: now - 2 * 86400000 },
    { id: 's10', carrierId: 'dev-carrier-2', flightId: 'f6', kind: 'bag_tag', code: 'ICN', appliedAt: now - 86400000 },
  ];
  for (const s of stickers) await db.stickers.put(s);
}

export function makeDevDraft() {
  const from = cityByCode('ICN')!;
  const to = cityByCode('HND')!;
  const plan = planRoute(from, to);
  const map = buildSeatMap(plan.aircraft, 12345);
  const seat = autoAssign(map, 'gold') || map.seats[0];
  return { plan, seat, purpose: 'work' as const };
}
