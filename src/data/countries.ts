/**
 * Countries the app flies to: what a passport from there looks like (cover color, name in its
 * own language) and how its border officers ink a passport (stamp shape, ink, wording).
 *
 * Stamp designs are stylized after each country's real practice (Japan's rectangular "上陸許可",
 * Korea's oval, the Schengen star ring...), not copies of real stamps. No national emblems.
 */

export type StampShape = 'circle' | 'oval' | 'rect' | 'schengen' | 'hexagon' | 'arch';

export interface StampStyle {
  shape: StampShape;
  ink: string;
  /** Who stamps: printed around the rim or across the top. */
  authority: string;
  /** Entry and exit wording, local language first where the stamp has it. */
  entry: string;
  exit: string;
  /** Schengen country mark inside the star ring ("F", "D", "NL"...). */
  mark?: string;
}

export interface Country {
  /** ISO 3166-1 alpha-2. */
  code: string;
  /** ISO 3166-1 alpha-3, as printed in the passport's machine-readable zone. */
  iso3: string;
  name: string;
  /** The country's name in its own language, for the passport cover. */
  native: string;
  /** Passport cover color. */
  cover: string;
  /** Official name in English for the cover, when it differs from `name`. */
  official?: string;
  /** "Passport" in the country's own language, printed above PASSPORT on the cover. */
  passportWord?: string;
  stamp: StampStyle;
}

const INK = {
  blue: '#26448f',
  navy: '#22346b',
  violet: '#55388a',
  red: '#a93226',
  green: '#2c6a43',
  teal: '#1d6875',
  black: '#2a2622',
  maroon: '#7d2235',
};

const COVER = {
  navy: '#1d2e4f',
  blue: '#1f3a5f',
  teal: '#1c4152',
  burgundy: '#5e1a26',
  red: '#7a1f27',
  green: '#1f4434',
  black: '#1c1d1f',
};

const schengen = (mark: string, ink: string): StampStyle => ({
  shape: 'schengen',
  ink,
  authority: 'SCHENGEN',
  entry: 'ENTRY',
  exit: 'EXIT',
  mark,
});

const USA_STAMP: StampStyle = {
  shape: 'rect',
  ink: INK.violet,
  authority: 'U.S. CUSTOMS AND BORDER PROTECTION',
  entry: 'ADMITTED',
  exit: 'DEPARTED',
};

export const COUNTRIES: readonly Country[] = [
  { code: 'KR', iso3: 'KOR', name: 'South Korea', native: '대한민국', cover: COVER.teal, official: 'Republic of Korea', passportWord: '여권',
    stamp: { shape: 'oval', ink: INK.blue, authority: 'KOREA IMMIGRATION SERVICE', entry: '입국 ARRIVAL', exit: '출국 DEPARTURE' } },
  { code: 'JP', iso3: 'JPN', name: 'Japan', native: '日本国', cover: COVER.red, passportWord: '旅券',
    stamp: { shape: 'rect', ink: INK.red, authority: 'JAPAN IMMIGRATION', entry: '上陸許可 ADMITTED', exit: '出国 DEPARTED' } },
  { code: 'CN', iso3: 'CHN', name: 'China', native: '中国', cover: COVER.red, official: "People's Republic of China", passportWord: '护照',
    stamp: { shape: 'rect', ink: INK.green, authority: 'CHINA IMMIGRATION INSPECTION', entry: '入境 ENTRY', exit: '出境 EXIT' } },
  { code: 'HK', iso3: 'HKG', name: 'Hong Kong', native: '香港', cover: COVER.navy, official: 'Hong Kong SAR China', passportWord: '護照',
    stamp: { shape: 'hexagon', ink: INK.blue, authority: 'HONG KONG IMMIGRATION', entry: '入境 ARRIVAL', exit: '離境 DEPARTURE' } },
  { code: 'MO', iso3: 'MAC', name: 'Macau', native: '澳門', cover: COVER.green, official: 'Macao SAR China', passportWord: '護照',
    stamp: { shape: 'circle', ink: INK.green, authority: 'MACAO IMMIGRATION', entry: '入境 ENTRY', exit: '出境 EXIT' } },
  { code: 'TW', iso3: 'TWN', name: 'Taiwan', native: '臺灣', cover: COVER.green, passportWord: '護照',
    stamp: { shape: 'rect', ink: INK.blue, authority: 'TAIWAN IMMIGRATION', entry: '入境 ARRIVAL', exit: '出境 DEPARTURE' } },
  { code: 'MN', iso3: 'MNG', name: 'Mongolia', native: 'Монгол Улс', cover: COVER.blue, passportWord: 'Паспорт',
    stamp: { shape: 'circle', ink: INK.teal, authority: 'MONGOLIA BORDER PROTECTION', entry: 'ОРОХ ENTRY', exit: 'ГАРАХ EXIT' } },
  { code: 'KZ', iso3: 'KAZ', name: 'Kazakhstan', native: 'Қазақстан', cover: COVER.teal, official: 'Republic of Kazakhstan', passportWord: 'Паспорт',
    stamp: { shape: 'arch', ink: INK.teal, authority: 'KAZAKHSTAN BORDER SERVICE', entry: 'КІРУ ENTRY', exit: 'ШЫҒУ EXIT' } },
  { code: 'UZ', iso3: 'UZB', name: 'Uzbekistan', native: "O'zbekiston", cover: COVER.green, official: 'Republic of Uzbekistan', passportWord: 'Pasport',
    stamp: { shape: 'circle', ink: INK.violet, authority: 'UZBEKISTAN BORDER', entry: 'KIRISH ENTRY', exit: 'CHIQISH EXIT' } },
  { code: 'RU', iso3: 'RUS', name: 'Russia', native: 'Россия', cover: COVER.red, official: 'Russian Federation', passportWord: 'Паспорт',
    stamp: { shape: 'rect', ink: INK.violet, authority: 'ПОГРАНИЧНЫЙ КОНТРОЛЬ', entry: 'ВЪЕЗД ENTRY', exit: 'ВЫЕЗД EXIT' } },
  { code: 'TH', iso3: 'THA', name: 'Thailand', native: 'Thailand', cover: COVER.burgundy, official: 'Kingdom of Thailand',
    stamp: { shape: 'rect', ink: INK.blue, authority: 'IMMIGRATION · THAILAND', entry: 'ADMITTED', exit: 'DEPARTED' } },
  { code: 'VN', iso3: 'VNM', name: 'Vietnam', native: 'Việt Nam', cover: COVER.green, official: 'Socialist Republic of Viet Nam', passportWord: 'Hộ chiếu',
    stamp: { shape: 'circle', ink: INK.red, authority: 'VIETNAM IMMIGRATION', entry: 'NHẬP CẢNH ENTRY', exit: 'XUẤT CẢNH EXIT' } },
  { code: 'SG', iso3: 'SGP', name: 'Singapore', native: 'Singapura', cover: COVER.red, official: 'Republic of Singapore',
    stamp: { shape: 'hexagon', ink: INK.navy, authority: 'SINGAPORE ICA', entry: 'ARRIVAL', exit: 'DEPARTURE' } },
  { code: 'MY', iso3: 'MYS', name: 'Malaysia', native: 'Malaysia', cover: COVER.burgundy,
    stamp: { shape: 'rect', ink: INK.blue, authority: 'IMIGRESEN MALAYSIA', entry: 'MASUK ENTRY', exit: 'KELUAR EXIT' } },
  { code: 'ID', iso3: 'IDN', name: 'Indonesia', native: 'Indonesia', cover: COVER.green, official: 'Republic of Indonesia', passportWord: 'Paspor',
    stamp: { shape: 'circle', ink: INK.violet, authority: 'IMIGRASI INDONESIA', entry: 'KEDATANGAN ARRIVAL', exit: 'KEBERANGKATAN DEPARTURE' } },
  { code: 'PH', iso3: 'PHL', name: 'Philippines', native: 'Pilipinas', cover: COVER.navy, official: 'Republic of the Philippines', passportWord: 'Pasaporte',
    stamp: { shape: 'oval', ink: INK.blue, authority: 'BUREAU OF IMMIGRATION', entry: 'ARRIVAL', exit: 'DEPARTURE' } },
  { code: 'IN', iso3: 'IND', name: 'India', native: 'भारत', cover: COVER.navy, official: 'Republic of India', passportWord: 'पासपोर्ट',
    stamp: { shape: 'circle', ink: INK.violet, authority: 'IMMIGRATION · INDIA', entry: 'ARRIVED', exit: 'DEPARTED' } },
  { code: 'LK', iso3: 'LKA', name: 'Sri Lanka', native: 'Sri Lanka', cover: COVER.navy, official: 'Democratic Socialist Republic of Sri Lanka',
    stamp: { shape: 'oval', ink: INK.red, authority: 'SRI LANKA IMMIGRATION', entry: 'ARRIVAL', exit: 'DEPARTURE' } },
  { code: 'NP', iso3: 'NPL', name: 'Nepal', native: 'Nepal', cover: COVER.red,
    stamp: { shape: 'circle', ink: INK.blue, authority: 'IMMIGRATION · NEPAL', entry: 'ARRIVAL', exit: 'DEPARTURE' } },
  { code: 'AE', iso3: 'ARE', name: 'United Arab Emirates', native: 'UAE', cover: COVER.green,
    stamp: { shape: 'rect', ink: INK.green, authority: 'UAE IMMIGRATION', entry: 'ARRIVAL', exit: 'DEPARTURE' } },
  { code: 'QA', iso3: 'QAT', name: 'Qatar', native: 'Qatar', cover: COVER.burgundy, official: 'State of Qatar',
    stamp: { shape: 'hexagon', ink: INK.maroon, authority: 'STATE OF QATAR', entry: 'ARRIVAL', exit: 'DEPARTURE' } },
  { code: 'TR', iso3: 'TUR', name: 'Türkiye', native: 'Türkiye', cover: COVER.burgundy, official: 'Republic of Türkiye', passportWord: 'Pasaport',
    stamp: { shape: 'rect', ink: INK.blue, authority: 'TÜRKİYE CUMHURİYETİ', entry: 'GİRİŞ ENTRY', exit: 'ÇIKIŞ EXIT' } },
  { code: 'EG', iso3: 'EGY', name: 'Egypt', native: 'Egypt', cover: COVER.green, official: 'Arab Republic of Egypt',
    stamp: { shape: 'circle', ink: INK.violet, authority: 'ARAB REPUBLIC OF EGYPT', entry: 'ARRIVAL', exit: 'DEPARTURE' } },
  { code: 'ZA', iso3: 'ZAF', name: 'South Africa', native: 'South Africa', cover: COVER.green, official: 'Republic of South Africa',
    stamp: { shape: 'rect', ink: INK.black, authority: 'HOME AFFAIRS · SOUTH AFRICA', entry: 'ADMITTED', exit: 'DEPARTED' } },
  { code: 'FR', iso3: 'FRA', name: 'France', native: 'France', cover: COVER.burgundy, official: 'République Française', passportWord: 'Passeport', stamp: schengen('F', INK.blue) },
  { code: 'DE', iso3: 'D<<', name: 'Germany', native: 'Deutschland', cover: COVER.burgundy, official: 'Bundesrepublik Deutschland', passportWord: 'Reisepass', stamp: schengen('D', INK.black) },
  { code: 'IT', iso3: 'ITA', name: 'Italy', native: 'Italia', cover: COVER.burgundy, official: 'Repubblica Italiana', passportWord: 'Passaporto', stamp: schengen('I', INK.green) },
  { code: 'ES', iso3: 'ESP', name: 'Spain', native: 'España', cover: COVER.burgundy, passportWord: 'Pasaporte', stamp: schengen('E', INK.red) },
  { code: 'NL', iso3: 'NLD', name: 'Netherlands', native: 'Nederland', cover: COVER.burgundy, official: 'Koninkrijk der Nederlanden', passportWord: 'Paspoort', stamp: schengen('NL', INK.blue) },
  { code: 'AT', iso3: 'AUT', name: 'Austria', native: 'Österreich', cover: COVER.burgundy, official: 'Republik Österreich', passportWord: 'Reisepass', stamp: schengen('A', INK.red) },
  { code: 'CH', iso3: 'CHE', name: 'Switzerland', native: 'Schweiz · Suisse', cover: COVER.red, official: 'Confoederatio Helvetica', passportWord: 'Pass · Passeport', stamp: schengen('CH', INK.black) },
  { code: 'CZ', iso3: 'CZE', name: 'Czechia', native: 'Česko', cover: COVER.burgundy, official: 'Česká republika', passportWord: 'Cestovní pas', stamp: schengen('CZ', INK.violet) },
  { code: 'DK', iso3: 'DNK', name: 'Denmark', native: 'Danmark', cover: COVER.burgundy, passportWord: 'Pas', stamp: schengen('DK', INK.teal) },
  { code: 'FI', iso3: 'FIN', name: 'Finland', native: 'Suomi', cover: COVER.burgundy, passportWord: 'Passi', stamp: schengen('FIN', INK.blue) },
  { code: 'GB', iso3: 'GBR', name: 'United Kingdom', native: 'United Kingdom', cover: COVER.navy,
    stamp: { shape: 'rect', ink: INK.black, authority: 'UK BORDER FORCE', entry: 'LEAVE TO ENTER', exit: 'DEPARTED' } },
  { code: 'US', iso3: 'USA', name: 'United States', native: 'United States', cover: COVER.navy, official: 'United States of America', stamp: USA_STAMP },
  { code: 'GU', iso3: 'GUM', name: 'Guam', native: 'Guam', cover: COVER.navy, stamp: USA_STAMP },
  { code: 'MP', iso3: 'MNP', name: 'Northern Mariana Islands', native: 'Saipan', cover: COVER.navy, stamp: USA_STAMP },
  { code: 'CA', iso3: 'CAN', name: 'Canada', native: 'Canada', cover: COVER.navy,
    stamp: { shape: 'circle', ink: INK.red, authority: 'CANADA BORDER SERVICES', entry: 'ARRIVED · ARRIVÉE', exit: 'DEPARTED · DÉPART' } },
  { code: 'MX', iso3: 'MEX', name: 'Mexico', native: 'México', cover: COVER.green, official: 'Estados Unidos Mexicanos', passportWord: 'Pasaporte',
    stamp: { shape: 'oval', ink: INK.green, authority: 'INSTITUTO NACIONAL DE MIGRACIÓN', entry: 'ENTRADA', exit: 'SALIDA' } },
  { code: 'BR', iso3: 'BRA', name: 'Brazil', native: 'Brasil', cover: COVER.navy, official: 'República Federativa do Brasil', passportWord: 'Passaporte',
    stamp: { shape: 'rect', ink: INK.blue, authority: 'POLÍCIA FEDERAL · BRASIL', entry: 'ENTRADA', exit: 'SAÍDA' } },
  { code: 'AU', iso3: 'AUS', name: 'Australia', native: 'Australia', cover: COVER.navy,
    stamp: { shape: 'arch', ink: INK.black, authority: 'AUSTRALIAN BORDER FORCE', entry: 'ARRIVED', exit: 'DEPARTED' } },
  { code: 'NZ', iso3: 'NZL', name: 'New Zealand', native: 'Aotearoa', cover: COVER.black,
    stamp: { shape: 'arch', ink: INK.black, authority: 'NEW ZEALAND CUSTOMS', entry: 'ARRIVED', exit: 'DEPARTED' } },
];

/** Carry On's own ink, for flights that never leave the country (scenic loops, domestic hops). */
export const HOUSE_STAMP: StampStyle = {
  shape: 'circle',
  ink: '#b9392a',
  authority: 'CARRY ON AIRWAYS',
  entry: 'LANDED',
  exit: 'DEPARTED',
};

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

export function countryByCode(code: string): Country | undefined {
  return BY_CODE.get(code);
}
