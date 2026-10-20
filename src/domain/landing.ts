import type { CabinClass } from './seatmap';
import { TIER_MILE_BONUS } from './tier';
import type { Tier } from './types';

export type StickerKind = 'bag_tag' | 'priority' | 'security' | 'transfer' | 'fragile' | 'heavy';

export function earnedMiles(baseMiles: number, tier: Tier): number {
  return Math.round(baseMiles * (1 + TIER_MILE_BONUS[tier]));
}

/** Stickers put on the carrier when a flight lands. */
export function stickersForLanding(cabin: CabinClass, tier: Tier): StickerKind[] {
  const kinds: StickerKind[] = ['bag_tag'];
  if (cabin !== 'economy' || tier === 'gold' || tier === 'platinum') kinds.push('priority');
  return kinds;
}

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
