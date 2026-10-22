import { aircraftFor, distanceKm, flightMinutes, milesFor } from './geo';
import type { City, Route } from './types';

/** Sessions this short can fly a loop over the departure city. */
export const SCENIC_MAX_MINUTES = 45;
export const SCENIC_MILES_PER_MINUTE = 5;

export function routeBetween(from: City, to: City): Route {
  const km = distanceKm(from, to);
  return {
    from,
    to,
    km,
    minutes: flightMinutes(km),
    miles: milesFor(km),
    aircraft: aircraftFor(km),
  };
}

/** Every destination from `origin`, shortest first. */
export function routesFrom(origin: City, cities: readonly City[]): Route[] {
  return cities
    .filter((c) => c.code !== origin.code)
    .map((c) => routeBetween(origin, c))
    .sort((a, b) => a.minutes - b.minutes);
}

/** ±10% of the target, but never tighter than ±10 minutes. */
export function toleranceFor(targetMinutes: number): number {
  return Math.max(10, Math.round(targetMinutes * 0.1));
}

/** Destinations whose flight time is close to `targetMinutes`, closest match first. */
export function routesNearDuration(
  origin: City,
  cities: readonly City[],
  targetMinutes: number,
): Route[] {
  const tolerance = toleranceFor(targetMinutes);
  return routesFrom(origin, cities)
    .filter((r) => Math.abs(r.minutes - targetMinutes) <= tolerance)
    .sort(
      (a, b) =>
        Math.abs(a.minutes - targetMinutes) - Math.abs(b.minutes - targetMinutes) ||
        a.minutes - b.minutes,
    );
}

/**
 * "Surprise me": a flight of about `targetMinutes` from anywhere in the world (not just where you
 * are), so even short sessions reach new places. Three times in four it picks a country you
 * haven't landed in yet, while there are any; otherwise any of them.
 */
export function surpriseRoute(
  cities: readonly City[],
  targetMinutes: number,
  rand: () => number,
  visited: ReadonlySet<string> = new Set(),
): Route | null {
  const all = cities.flatMap((origin) => routesNearDuration(origin, cities, targetMinutes));
  if (all.length === 0) return null;
  const fresh = all.filter((r) => !visited.has(r.to.countryCode));
  const pool = fresh.length > 0 && rand() < 0.75 ? fresh : all;
  return pool[Math.floor(rand() * pool.length)];
}

export function scenicMiles(minutes: number): number {
  return minutes * SCENIC_MILES_PER_MINUTE;
}
