import { airlineFor, HOUSE_AIRLINE, type Airline } from '../data/airlines';
import { routeBetween, scenicMiles } from './booking';
import { hashString, seededRandom } from './random';
import type { AircraftClass, City } from './types';

export const AIRCRAFT_LABEL: Record<AircraftClass, string> = {
  narrowbody: 'Narrow-body jet',
  widebody: 'Wide-body jet',
  longhaul: 'Long-haul wide-body',
};

/** Everything printed on the boarding pass, decided before check-in. */
export interface FlightPlan {
  fromCode: string;
  /** Same as fromCode for scenic flights. */
  toCode: string;
  scenic: boolean;
  minutes: number;
  miles: number;
  aircraft: AircraftClass;
  airline: Airline;
  flightNumber: string;
  gate: string;
}

export function planRoute(from: City, to: City): FlightPlan {
  const route = routeBetween(from, to);
  const airline = airlineFor(from.countryCode);
  return {
    fromCode: from.code,
    toCode: to.code,
    scenic: false,
    minutes: route.minutes,
    miles: route.miles,
    aircraft: route.aircraft,
    airline,
    ...flightNumberAndGate(airline, `${from.code}-${to.code}`),
  };
}

export function planScenic(from: City, minutes: number): FlightPlan {
  return {
    fromCode: from.code,
    toCode: from.code,
    scenic: true,
    minutes,
    miles: scenicMiles(minutes),
    aircraft: 'narrowbody',
    airline: HOUSE_AIRLINE,
    ...flightNumberAndGate(HOUSE_AIRLINE, `${from.code}-scenic-${minutes}`),
  };
}

/** A route keeps its flight number like a real scheduled service; the gate changes per day. */
function flightNumberAndGate(airline: Airline, routeKey: string, day = new Date().toDateString()) {
  const number = 100 + (hashString(routeKey) % 900);
  const rand = seededRandom(hashString(`${routeKey}|${day}`));
  const gate = `${'ABCDE'[Math.floor(rand() * 5)]}${1 + Math.floor(rand() * 48)}`;
  return { flightNumber: `${airline.code} ${number}`, gate };
}
