import type { AircraftClass, LatLon } from './types';

const EARTH_RADIUS_KM = 6371;
const KM_TO_MILES = 0.621371;

/** Average block speed used to turn distance into focus time. */
export const CRUISE_KMH = 800;
/** Taxi, climb and descent added to every flight. */
export const GROUND_MINUTES = 30;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance (haversine). */
export function distanceKm(a: LatLon, b: LatLon): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Focus minutes for a flight of `km`, rounded to 5 minutes. */
export function flightMinutes(km: number): number {
  const raw = (km / CRUISE_KMH) * 60 + GROUND_MINUTES;
  return Math.round(raw / 5) * 5;
}

export function milesFor(km: number): number {
  return Math.round(km * KM_TO_MILES);
}

export function aircraftFor(km: number): AircraftClass {
  if (km < 2500) return 'narrowbody';
  if (km < 7000) return 'widebody';
  return 'longhaul';
}

/** 100 → "1h 40m", 45 → "45m", 120 → "2h" */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
