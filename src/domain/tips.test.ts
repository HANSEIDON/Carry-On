import { describe, expect, it } from 'vitest';
import { markSeen, nextTip, TIP_CHANCE, TIP_GAP_MS, TIPS } from './tips';

const NOW = 1_800_000_000_000;

describe('tips', () => {
  it('shows none within a day of the last one, and only on some visits', () => {
    expect(nextTip({ lastShownAt: NOW - TIP_GAP_MS + 1, seen: [] }, NOW, 0)).toBeNull();
    expect(nextTip({ lastShownAt: 0, seen: [] }, NOW, TIP_CHANCE)).toBeNull();
    expect(nextTip({ lastShownAt: 0, seen: [] }, NOW, 0)).toEqual(TIPS[0]);
  });

  it('goes through every tip once before repeating, then repeats the oldest', () => {
    let seen: string[] = [];
    for (let i = 0; i < TIPS.length; i++) {
      const tip = nextTip({ lastShownAt: 0, seen }, NOW, 0)!;
      expect(seen).not.toContain(tip.id);
      seen = markSeen(seen, tip.id);
    }
    expect(nextTip({ lastShownAt: 0, seen }, NOW, 0)!.id).toBe(seen[0]);
    expect(markSeen(seen, seen[0]).at(-1)).toBe(seen[0]);
  });
});
