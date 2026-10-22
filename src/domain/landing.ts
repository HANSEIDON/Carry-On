import { hashString, seededRandom } from './random';
import type { CabinClass } from './seatmap';
import { TIER_MILE_BONUS } from './tier';
import type { Tier } from './types';

export type StickerKind = 'bag_tag' | 'priority' | 'security' | 'transfer' | 'fragile' | 'heavy';

export function earnedMiles(baseMiles: number, tier: Tier): number {
  return Math.round(baseMiles * (1 + TIER_MILE_BONUS[tier]));
}

/**
 * Stickers put on the carrier when a flight lands: the destination's travel label always, a
 * priority label in business and first (or for gold and platinum members), and now and then a
 * handling sticker the ground crew slapped on (fixed per flight, by `flightId`): fragile most
 * often, then screened, heavy (on flights of two hours or more), transfer (on long hauls).
 */
export function stickersForLanding(cabin: CabinClass, tier: Tier, flight?: { id: string; minutes: number }): StickerKind[] {
  const kinds: StickerKind[] = ['bag_tag'];
  if (cabin !== 'economy' || tier === 'gold' || tier === 'platinum') kinds.push('priority');
  if (flight) {
    const rand = seededRandom(hashString(`${flight.id}|handling`));
    if (rand() < HANDLING_CHANCE) {
      const pick = rand();
      if (pick < 0.4) kinds.push('fragile');
      else if (pick < 0.7) kinds.push('security');
      else if (pick < 0.9) kinds.push(flight.minutes >= 120 ? 'heavy' : 'fragile');
      else kinds.push(flight.minutes >= 360 ? 'transfer' : 'security');
    }
  }
  return kinds;
}

/** How often a landing comes with a handling sticker too. */
export const HANDLING_CHANCE = 0.3;

/** Remaining focus time; never negative. */
export function remainingMs(startedAt: number, plannedMinutes: number, now: number, timeScale = 1): number {
  const elapsed = (now - startedAt) * timeScale;
  return Math.max(0, plannedMinutes * 60_000 - elapsed);
}

/** 0..1 */
export function progress(startedAt: number, plannedMinutes: number, now: number, timeScale = 1): number {
  return 1 - remainingMs(startedAt, plannedMinutes, now, timeScale) / (plannedMinutes * 60_000);
}

/** "1:05:09" or "4:07" */
export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
