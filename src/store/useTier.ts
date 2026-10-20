import { DEV_TIER } from '../dev';
import { tierFor } from '../domain/tier';
import type { Tier } from '../domain/types';
import { useApp } from './appStore';

export function useTier(): Tier {
  const lifetimeMiles = useApp((s) => s.profile?.lifetimeMiles ?? 0);
  return DEV_TIER ?? tierFor(lifetimeMiles);
}
