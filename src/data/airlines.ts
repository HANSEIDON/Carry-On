/**
 * Fictional airlines. Never use real airline names or logos (trademarks).
 * Names and codes are placeholders; review before launch.
 */
export interface Airline {
  code: string;
  name: string;
  /** Livery color, used for the boarding pass band and bag tags. */
  color: string;
}

const HANUL: Airline = { code: 'HL', name: 'Hanul Air', color: '#1f5fa8' };
const SILK_ROAD: Airline = { code: 'SR', name: 'Silk Road Airlines', color: '#b3261e' };
const FORMOSA: Airline = { code: 'FS', name: 'Formosa Skies', color: '#2e7d6b' };
const SAKURA: Airline = { code: 'SW', name: 'Sakura Wings', color: '#c2185b' };
const STEPPE: Airline = { code: 'SP', name: 'Steppe Air', color: '#3b6e8f' };
const MONSOON: Airline = { code: 'MN', name: 'Monsoon Air', color: '#d9711c' };
const LOTUS: Airline = { code: 'LW', name: 'Lotus Airways', color: '#7b3fa0' };
const OASIS: Airline = { code: 'OW', name: 'Oasis Airways', color: '#a07a2c' };
const AURELIA: Airline = { code: 'AU', name: 'Aurelia Air', color: '#2b4c7e' };
const SAVANNA: Airline = { code: 'SV', name: 'Savanna Air', color: '#5f7d1f' };
const SOUTHERN_CROSS: Airline = { code: 'SC', name: 'Southern Cross Air', color: '#0f6e8c' };
const PIONEER: Airline = { code: 'PP', name: 'Pioneer Pacific', color: '#8b1e3f' };

export const HOUSE_AIRLINE: Airline = { code: 'CO', name: 'Carry On Airways', color: '#4c8dff' };

const BY_COUNTRY: Record<string, Airline> = {
  KR: HANUL,
  CN: SILK_ROAD, HK: SILK_ROAD, MO: SILK_ROAD,
  TW: FORMOSA,
  JP: SAKURA,
  MN: STEPPE, RU: STEPPE, KZ: STEPPE, UZ: STEPPE,
  TH: MONSOON, SG: MONSOON, MY: MONSOON, VN: MONSOON, PH: MONSOON, ID: MONSOON,
  IN: LOTUS, NP: LOTUS, LK: LOTUS,
  AE: OASIS, QA: OASIS, TR: OASIS, EG: OASIS,
  GB: AURELIA, FR: AURELIA, DE: AURELIA, NL: AURELIA, IT: AURELIA, ES: AURELIA,
  CH: AURELIA, AT: AURELIA, CZ: AURELIA, FI: AURELIA, DK: AURELIA,
  ZA: SAVANNA,
  AU: SOUTHERN_CROSS, NZ: SOUTHERN_CROSS, GU: SOUTHERN_CROSS, MP: SOUTHERN_CROSS,
  US: PIONEER, CA: PIONEER, MX: PIONEER, BR: PIONEER,
};

const BY_CODE = new Map(
  [HOUSE_AIRLINE, ...Object.values(BY_COUNTRY)].map((a) => [a.code, a] as const),
);

/** The airline flying out of a country. Scenic flights use the house airline. */
export function airlineFor(countryCode: string): Airline {
  return BY_COUNTRY[countryCode] ?? HOUSE_AIRLINE;
}

export function airlineByCode(code: string): Airline {
  return BY_CODE.get(code) ?? HOUSE_AIRLINE;
}
