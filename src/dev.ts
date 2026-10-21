import type { Tier } from './domain/types';

/**
 * Dev-only URL switches (ignored in production builds):
 *   ?tier=gold  preview a membership tier's design
 *   ?speed=60   run flights 60x faster to test landing
 *   ?bake-carriers  bake card pictures and sticker spots from the models (src/components/carrierBake.ts)
 */
const params = import.meta.env.DEV ? new URLSearchParams(location.search) : new URLSearchParams();

const TIERS: Tier[] = ['basic', 'silver', 'gold', 'platinum'];

export const DEV_TIER: Tier | null = TIERS.find((t) => t === params.get('tier')) ?? null;

export const TIME_SCALE: number = Math.max(1, Number(params.get('speed')) || 1);

export const BAKE_CARRIERS: boolean = params.has('bake-carriers');
