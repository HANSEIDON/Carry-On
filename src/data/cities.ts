import type { City } from '../domain/types';

/**
 * Airport coordinates (WGS84). One main airport per city.
 * Source of truth for coordinates/codes: OurAirports (public domain).
 */
export const CITIES: readonly City[] = [
  // Korea
  { code: 'ICN', city: 'Seoul', airport: 'Incheon', country: 'South Korea', countryCode: 'KR', lat: 37.4602, lon: 126.4407, tz: 'Asia/Seoul' },
  { code: 'PUS', city: 'Busan', airport: 'Gimhae', country: 'South Korea', countryCode: 'KR', lat: 35.1795, lon: 128.9382, tz: 'Asia/Seoul' },
  { code: 'CJU', city: 'Jeju', airport: 'Jeju', country: 'South Korea', countryCode: 'KR', lat: 33.5113, lon: 126.493, tz: 'Asia/Seoul' },
  // China
  { code: 'PEK', city: 'Beijing', airport: 'Capital', country: 'China', countryCode: 'CN', lat: 40.0799, lon: 116.6031, tz: 'Asia/Shanghai' },
  { code: 'PVG', city: 'Shanghai', airport: 'Pudong', country: 'China', countryCode: 'CN', lat: 31.1443, lon: 121.8083, tz: 'Asia/Shanghai' },
  { code: 'TAO', city: 'Qingdao', airport: 'Jiaodong', country: 'China', countryCode: 'CN', lat: 36.3617, lon: 120.088, tz: 'Asia/Shanghai' },
  { code: 'HRB', city: 'Harbin', airport: 'Taiping', country: 'China', countryCode: 'CN', lat: 45.6234, lon: 126.2503, tz: 'Asia/Shanghai' },
  { code: 'XIY', city: "Xi'an", airport: 'Xianyang', country: 'China', countryCode: 'CN', lat: 34.4471, lon: 108.7516, tz: 'Asia/Shanghai' },
  { code: 'CTU', city: 'Chengdu', airport: 'Shuangliu', country: 'China', countryCode: 'CN', lat: 30.5785, lon: 103.9471, tz: 'Asia/Shanghai' },
  { code: 'CAN', city: 'Guangzhou', airport: 'Baiyun', country: 'China', countryCode: 'CN', lat: 23.3924, lon: 113.2988, tz: 'Asia/Shanghai' },
  { code: 'SZX', city: 'Shenzhen', airport: "Bao'an", country: 'China', countryCode: 'CN', lat: 22.6393, lon: 113.8107, tz: 'Asia/Shanghai' },
  { code: 'HKG', city: 'Hong Kong', airport: 'Hong Kong', country: 'Hong Kong', countryCode: 'HK', lat: 22.308, lon: 113.9185, tz: 'Asia/Hong_Kong' },
  { code: 'MFM', city: 'Macau', airport: 'Macau', country: 'Macau', countryCode: 'MO', lat: 22.1496, lon: 113.5916, tz: 'Asia/Macau' },
  { code: 'TPE', city: 'Taipei', airport: 'Taoyuan', country: 'Taiwan', countryCode: 'TW', lat: 25.0797, lon: 121.2342, tz: 'Asia/Taipei' },
  // Japan
  { code: 'HND', city: 'Tokyo', airport: 'Haneda', country: 'Japan', countryCode: 'JP', lat: 35.5494, lon: 139.7798, tz: 'Asia/Tokyo' },
  { code: 'KIX', city: 'Osaka', airport: 'Kansai', country: 'Japan', countryCode: 'JP', lat: 34.432, lon: 135.2304, tz: 'Asia/Tokyo' },
  { code: 'FUK', city: 'Fukuoka', airport: 'Fukuoka', country: 'Japan', countryCode: 'JP', lat: 33.5859, lon: 130.451, tz: 'Asia/Tokyo' },
  { code: 'CTS', city: 'Sapporo', airport: 'New Chitose', country: 'Japan', countryCode: 'JP', lat: 42.7752, lon: 141.6923, tz: 'Asia/Tokyo' },
  { code: 'OKA', city: 'Okinawa', airport: 'Naha', country: 'Japan', countryCode: 'JP', lat: 26.1958, lon: 127.6459, tz: 'Asia/Tokyo' },
  // North & Central Asia
  { code: 'UBN', city: 'Ulaanbaatar', airport: 'Chinggis Khaan', country: 'Mongolia', countryCode: 'MN', lat: 47.6467, lon: 106.8197, tz: 'Asia/Ulaanbaatar' },
  { code: 'VVO', city: 'Vladivostok', airport: 'Knevichi', country: 'Russia', countryCode: 'RU', lat: 43.399, lon: 132.148, tz: 'Asia/Vladivostok' },
  { code: 'ALA', city: 'Almaty', airport: 'Almaty', country: 'Kazakhstan', countryCode: 'KZ', lat: 43.3521, lon: 77.0405, tz: 'Asia/Almaty' },
  { code: 'TAS', city: 'Tashkent', airport: 'Islam Karimov', country: 'Uzbekistan', countryCode: 'UZ', lat: 41.2579, lon: 69.2812, tz: 'Asia/Tashkent' },
  // Southeast Asia
  { code: 'BKK', city: 'Bangkok', airport: 'Suvarnabhumi', country: 'Thailand', countryCode: 'TH', lat: 13.69, lon: 100.7501, tz: 'Asia/Bangkok' },
  { code: 'SIN', city: 'Singapore', airport: 'Changi', country: 'Singapore', countryCode: 'SG', lat: 1.3644, lon: 103.9915, tz: 'Asia/Singapore' },
  { code: 'KUL', city: 'Kuala Lumpur', airport: 'KLIA', country: 'Malaysia', countryCode: 'MY', lat: 2.7456, lon: 101.7099, tz: 'Asia/Kuala_Lumpur' },
  { code: 'SGN', city: 'Ho Chi Minh City', airport: 'Tan Son Nhat', country: 'Vietnam', countryCode: 'VN', lat: 10.8188, lon: 106.652, tz: 'Asia/Ho_Chi_Minh' },
  { code: 'HAN', city: 'Hanoi', airport: 'Noi Bai', country: 'Vietnam', countryCode: 'VN', lat: 21.2212, lon: 105.8072, tz: 'Asia/Ho_Chi_Minh' },
  { code: 'DAD', city: 'Da Nang', airport: 'Da Nang', country: 'Vietnam', countryCode: 'VN', lat: 16.0439, lon: 108.1994, tz: 'Asia/Ho_Chi_Minh' },
  { code: 'MNL', city: 'Manila', airport: 'Ninoy Aquino', country: 'Philippines', countryCode: 'PH', lat: 14.5086, lon: 121.0198, tz: 'Asia/Manila' },
  { code: 'CEB', city: 'Cebu', airport: 'Mactan-Cebu', country: 'Philippines', countryCode: 'PH', lat: 10.3075, lon: 123.9794, tz: 'Asia/Manila' },
  { code: 'CGK', city: 'Jakarta', airport: 'Soekarno-Hatta', country: 'Indonesia', countryCode: 'ID', lat: -6.1256, lon: 106.6559, tz: 'Asia/Jakarta' },
  { code: 'DPS', city: 'Bali', airport: 'Ngurah Rai', country: 'Indonesia', countryCode: 'ID', lat: -8.7482, lon: 115.167, tz: 'Asia/Makassar' },
  // South Asia
  { code: 'DEL', city: 'Delhi', airport: 'Indira Gandhi', country: 'India', countryCode: 'IN', lat: 28.5562, lon: 77.1, tz: 'Asia/Kolkata' },
  { code: 'BOM', city: 'Mumbai', airport: 'Chhatrapati Shivaji', country: 'India', countryCode: 'IN', lat: 19.0896, lon: 72.8656, tz: 'Asia/Kolkata' },
  { code: 'KTM', city: 'Kathmandu', airport: 'Tribhuvan', country: 'Nepal', countryCode: 'NP', lat: 27.6966, lon: 85.3591, tz: 'Asia/Kathmandu' },
  { code: 'CMB', city: 'Colombo', airport: 'Bandaranaike', country: 'Sri Lanka', countryCode: 'LK', lat: 7.1808, lon: 79.8841, tz: 'Asia/Colombo' },
  // Middle East
  { code: 'DXB', city: 'Dubai', airport: 'Dubai', country: 'United Arab Emirates', countryCode: 'AE', lat: 25.2532, lon: 55.3657, tz: 'Asia/Dubai' },
  { code: 'DOH', city: 'Doha', airport: 'Hamad', country: 'Qatar', countryCode: 'QA', lat: 25.2731, lon: 51.6081, tz: 'Asia/Qatar' },
  { code: 'IST', city: 'Istanbul', airport: 'Istanbul', country: 'Türkiye', countryCode: 'TR', lat: 41.2753, lon: 28.7519, tz: 'Europe/Istanbul' },
  // Europe
  { code: 'LHR', city: 'London', airport: 'Heathrow', country: 'United Kingdom', countryCode: 'GB', lat: 51.47, lon: -0.4543, tz: 'Europe/London' },
  { code: 'CDG', city: 'Paris', airport: 'Charles de Gaulle', country: 'France', countryCode: 'FR', lat: 49.0097, lon: 2.5479, tz: 'Europe/Paris' },
  { code: 'FRA', city: 'Frankfurt', airport: 'Frankfurt', country: 'Germany', countryCode: 'DE', lat: 50.0379, lon: 8.5622, tz: 'Europe/Berlin' },
  { code: 'AMS', city: 'Amsterdam', airport: 'Schiphol', country: 'Netherlands', countryCode: 'NL', lat: 52.3105, lon: 4.7683, tz: 'Europe/Amsterdam' },
  { code: 'FCO', city: 'Rome', airport: 'Fiumicino', country: 'Italy', countryCode: 'IT', lat: 41.8003, lon: 12.2389, tz: 'Europe/Rome' },
  { code: 'MAD', city: 'Madrid', airport: 'Barajas', country: 'Spain', countryCode: 'ES', lat: 40.4983, lon: -3.5676, tz: 'Europe/Madrid' },
  { code: 'BCN', city: 'Barcelona', airport: 'El Prat', country: 'Spain', countryCode: 'ES', lat: 41.2974, lon: 2.0833, tz: 'Europe/Madrid' },
  { code: 'ZRH', city: 'Zurich', airport: 'Zurich', country: 'Switzerland', countryCode: 'CH', lat: 47.4582, lon: 8.5555, tz: 'Europe/Zurich' },
  { code: 'VIE', city: 'Vienna', airport: 'Schwechat', country: 'Austria', countryCode: 'AT', lat: 48.1103, lon: 16.5697, tz: 'Europe/Vienna' },
  { code: 'PRG', city: 'Prague', airport: 'Václav Havel', country: 'Czechia', countryCode: 'CZ', lat: 50.1008, lon: 14.26, tz: 'Europe/Prague' },
  { code: 'HEL', city: 'Helsinki', airport: 'Helsinki-Vantaa', country: 'Finland', countryCode: 'FI', lat: 60.3172, lon: 24.9633, tz: 'Europe/Helsinki' },
  { code: 'CPH', city: 'Copenhagen', airport: 'Kastrup', country: 'Denmark', countryCode: 'DK', lat: 55.618, lon: 12.6508, tz: 'Europe/Copenhagen' },
  // Africa
  { code: 'CAI', city: 'Cairo', airport: 'Cairo', country: 'Egypt', countryCode: 'EG', lat: 30.1219, lon: 31.4056, tz: 'Africa/Cairo' },
  { code: 'JNB', city: 'Johannesburg', airport: 'O. R. Tambo', country: 'South Africa', countryCode: 'ZA', lat: -26.1367, lon: 28.2411, tz: 'Africa/Johannesburg' },
  // Oceania & Pacific
  { code: 'GUM', city: 'Guam', airport: 'Antonio B. Won Pat', country: 'Guam', countryCode: 'GU', lat: 13.4834, lon: 144.796, tz: 'Pacific/Guam' },
  { code: 'SPN', city: 'Saipan', airport: 'Saipan', country: 'Northern Mariana Islands', countryCode: 'MP', lat: 15.119, lon: 145.729, tz: 'Pacific/Saipan' },
  { code: 'SYD', city: 'Sydney', airport: 'Kingsford Smith', country: 'Australia', countryCode: 'AU', lat: -33.9399, lon: 151.1753, tz: 'Australia/Sydney' },
  { code: 'MEL', city: 'Melbourne', airport: 'Tullamarine', country: 'Australia', countryCode: 'AU', lat: -37.669, lon: 144.841, tz: 'Australia/Melbourne' },
  { code: 'AKL', city: 'Auckland', airport: 'Auckland', country: 'New Zealand', countryCode: 'NZ', lat: -37.0082, lon: 174.785, tz: 'Pacific/Auckland' },
  { code: 'HNL', city: 'Honolulu', airport: 'Daniel K. Inouye', country: 'United States', countryCode: 'US', lat: 21.3245, lon: -157.9251, tz: 'Pacific/Honolulu' },
  // Americas
  { code: 'SEA', city: 'Seattle', airport: 'Seattle-Tacoma', country: 'United States', countryCode: 'US', lat: 47.4502, lon: -122.3088, tz: 'America/Los_Angeles' },
  { code: 'SFO', city: 'San Francisco', airport: 'San Francisco', country: 'United States', countryCode: 'US', lat: 37.6213, lon: -122.379, tz: 'America/Los_Angeles' },
  { code: 'LAX', city: 'Los Angeles', airport: 'Los Angeles', country: 'United States', countryCode: 'US', lat: 33.9416, lon: -118.4085, tz: 'America/Los_Angeles' },
  { code: 'ORD', city: 'Chicago', airport: "O'Hare", country: 'United States', countryCode: 'US', lat: 41.9742, lon: -87.9073, tz: 'America/Chicago' },
  { code: 'JFK', city: 'New York', airport: 'John F. Kennedy', country: 'United States', countryCode: 'US', lat: 40.6413, lon: -73.7781, tz: 'America/New_York' },
  { code: 'YVR', city: 'Vancouver', airport: 'Vancouver', country: 'Canada', countryCode: 'CA', lat: 49.1967, lon: -123.1815, tz: 'America/Vancouver' },
  { code: 'YYZ', city: 'Toronto', airport: 'Pearson', country: 'Canada', countryCode: 'CA', lat: 43.6777, lon: -79.6248, tz: 'America/Toronto' },
  { code: 'MEX', city: 'Mexico City', airport: 'Benito Juárez', country: 'Mexico', countryCode: 'MX', lat: 19.4361, lon: -99.0719, tz: 'America/Mexico_City' },
  { code: 'GRU', city: 'São Paulo', airport: 'Guarulhos', country: 'Brazil', countryCode: 'BR', lat: -23.4356, lon: -46.4731, tz: 'America/Sao_Paulo' },
];

const BY_CODE = new Map(CITIES.map((c) => [c.code, c]));

export function cityByCode(code: string): City | undefined {
  return BY_CODE.get(code);
}

export const DEFAULT_HOME_CODE = 'ICN';
