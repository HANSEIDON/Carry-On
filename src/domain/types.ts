export interface LatLon {
  lat: number;
  lon: number;
}

export interface City extends LatLon {
  /** IATA airport code, e.g. "ICN". Printed on bag tags. */
  code: string;
  city: string;
  airport: string;
  country: string;
  /** ISO 3166-1 alpha-2 */
  countryCode: string;
  /** IANA time zone, used for "local time is …" announcements. */
  tz: string;
}

export type Tier = 'basic' | 'silver' | 'gold' | 'platinum';

export type AircraftClass = 'narrowbody' | 'widebody' | 'longhaul';

export interface Route {
  from: City;
  to: City;
  km: number;
  minutes: number;
  miles: number;
  aircraft: AircraftClass;
}
