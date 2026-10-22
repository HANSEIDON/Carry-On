/**
 * Tips: one short line now and then, on the booking screen. Rare on purpose: at most one a day,
 * and even then only on about a third of the visits, each tip once before any repeats.
 */

export interface Tip {
  id: string;
  text: string;
}

export const TIPS: Tip[] = [
  { id: 'departure', text: 'You can fly from anywhere. Tap the departure city to start from another airport.' },
  { id: 'surprise', text: 'Short session? Surprise me finds a flight your length from anywhere in the world.' },
  { id: 'labels', text: 'Every country has its own travel label. New countries, new stickers.' },
  { id: 'fill', text: 'Fill every spot on a carrier: it’s kept just as it is, a fresh one is packed, and miles come back.' },
  { id: 'seat', text: 'Front seats are the quietest. Over the wing hums deep; the rear roars.' },
  { id: 'map', text: 'Change the in-flight map from its top corner: Paper, Classic or Night.' },
  { id: 'theme', text: 'Prefer the dark? The moon in your passport’s corner switches the look.' },
  { id: 'focus', text: 'Long session? Sound settings has a focus mode that turns the low rumble down.' },
];

/** At most one tip in this long. */
export const TIP_GAP_MS = 20 * 60 * 60 * 1000;
/** And then only on this share of visits. */
export const TIP_CHANCE = 0.35;

/**
 * The tip to show now, if any. `seen` is the tips shown so far, oldest first; one not shown yet
 * comes first, then the one shown longest ago. `roll` is a random number in [0, 1).
 */
export function nextTip(state: { lastShownAt: number; seen: readonly string[] }, now: number, roll: number): Tip | null {
  if (now - state.lastShownAt < TIP_GAP_MS || roll >= TIP_CHANCE) return null;
  const fresh = TIPS.find((t) => !state.seen.includes(t.id));
  if (fresh) return fresh;
  return TIPS.find((t) => t.id === state.seen[0]) ?? TIPS[0];
}

/** `seen` after showing `id`: moved to the end (most recent). */
export function markSeen(seen: readonly string[], id: string): string[] {
  return [...seen.filter((s) => s !== id), id];
}
