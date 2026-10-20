import type { LatLon } from './types';

const DAY_MS = 86_400_000;
/** 2000-01-01 12:00 UTC */
const J2000_MS = 946_728_000_000;

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const wrap180 = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;

/**
 * Point on Earth where the sun is directly overhead.
 * Low-precision solar ephemeris (Astronomical Almanac), good to ~0.1°, plenty for a map.
 */
export function subsolarPoint(at: Date): LatLon {
  const d = (at.getTime() - J2000_MS) / DAY_MS;
  const meanLon = 280.46 + 0.9856474 * d;
  const meanAnomaly = rad(357.528 + 0.9856003 * d);
  const eclipticLon = rad(meanLon + 1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly));
  const obliquity = rad(23.439 - 0.0000004 * d);

  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLon));
  const rightAscension = Math.atan2(Math.cos(obliquity) * Math.sin(eclipticLon), Math.cos(eclipticLon));
  const gmst = 280.46061837 + 360.98564736629 * d;

  return { lat: deg(declination), lon: wrap180(deg(rightAscension) - gmst) };
}

/** Angle (degrees) between two points as seen from Earth's center. */
export function centralAngle(a: LatLon, b: LatLon): number {
  const cos =
    Math.sin(rad(a.lat)) * Math.sin(rad(b.lat)) +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lon - a.lon));
  return deg(Math.acos(Math.min(1, Math.max(-1, cos))));
}

/** True when the sun is below the horizon at `p`. */
export function isNight(p: LatLon, at: Date): boolean {
  return centralAngle(p, subsolarPoint(at)) > 90;
}
