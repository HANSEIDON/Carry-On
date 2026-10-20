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

export function scenicMiles(minutes: number): number {
  return minutes * SCENIC_MILES_PER_MINUTE;
}
