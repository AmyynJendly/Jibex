import type { GeoPoint } from './geo';

/**
 * Tunisia's 24 governorates — the same list the backend uses (its
 * `TunisianCity` enum). Used to spot a city in a free-text address when the
 * server leaves the city field empty (every pickup's `pickupCity` is null),
 * and to place a parcel roughly on the map when it has no coordinates.
 */
export const GOVERNORATES = [
  'Tunis',
  'Ariana',
  'Ben Arous',
  'Manouba',
  'Nabeul',
  'Zaghouan',
  'Bizerte',
  'Béja',
  'Jendouba',
  'Le Kef',
  'Siliana',
  'Kairouan',
  'Kasserine',
  'Sidi Bouzid',
  'Sousse',
  'Monastir',
  'Mahdia',
  'Sfax',
  'Gabès',
  'Médenine',
  'Tataouine',
  'Gafsa',
  'Tozeur',
  'Kébili',
] as const;

export type Governorate = (typeof GOVERNORATES)[number];

/**
 * Where each governorate is, roughly: its capital city's centre. The server
 * sends no coordinates for parcels, so "Nearest first" measures to these —
 * good for "which region first", not for the exact door.
 */
export const GOVERNORATE_CENTERS: Record<Governorate, GeoPoint> = {
  Tunis: { lat: 36.8065, lng: 10.1815 },
  Ariana: { lat: 36.8625, lng: 10.1956 },
  'Ben Arous': { lat: 36.7531, lng: 10.2189 },
  Manouba: { lat: 36.8101, lng: 10.0956 },
  Nabeul: { lat: 36.4561, lng: 10.7376 },
  Zaghouan: { lat: 36.4029, lng: 10.1429 },
  Bizerte: { lat: 37.2744, lng: 9.8739 },
  Béja: { lat: 36.7256, lng: 9.1817 },
  Jendouba: { lat: 36.5011, lng: 8.7802 },
  'Le Kef': { lat: 36.1826, lng: 8.7148 },
  Siliana: { lat: 36.0849, lng: 9.3708 },
  Kairouan: { lat: 35.6781, lng: 10.0963 },
  Kasserine: { lat: 35.1676, lng: 8.8365 },
  'Sidi Bouzid': { lat: 35.0382, lng: 9.4849 },
  Sousse: { lat: 35.8256, lng: 10.636 },
  Monastir: { lat: 35.7643, lng: 10.8113 },
  Mahdia: { lat: 35.5047, lng: 11.0622 },
  Sfax: { lat: 34.7406, lng: 10.7603 },
  Gabès: { lat: 33.8815, lng: 10.0982 },
  Médenine: { lat: 33.3549, lng: 10.5055 },
  Tataouine: { lat: 32.9297, lng: 10.4518 },
  Gafsa: { lat: 34.425, lng: 8.7842 },
  Tozeur: { lat: 33.9197, lng: 8.1335 },
  Kébili: { lat: 33.7044, lng: 8.969 },
};

/**
 * Other spellings seen in addresses, mapped to the governorate's own name.
 * Accents and case never matter ("Medenine", "BEJA" and "gabes" already
 * match); these cover the spellings that differ in their letters.
 */
const ALIASES: Record<string, Governorate> = {
  kef: 'Le Kef',
  'el kef': 'Le Kef',
  'la manouba': 'Manouba',
  mannouba: 'Manouba',
  bizert: 'Bizerte',
  benzart: 'Bizerte',
  kairouane: 'Kairouan',
  kasserin: 'Kasserine',
  'sidi bou zid': 'Sidi Bouzid',
  mednine: 'Médenine',
  medenin: 'Médenine',
  tatouine: 'Tataouine',
  kebeli: 'Kébili',
  nabel: 'Nabeul',
};

const fold = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const NAMES: [string, Governorate][] = [
  ...GOVERNORATES.map((name) => [fold(name), name] as [string, Governorate]),
  ...(Object.entries(ALIASES) as [string, Governorate][]),
];

/**
 * The governorate named in a piece of text, spelled the standard way, or
 * undefined. Whole words only, ignoring case and accents: "12 rue X, sfax"
 * → "Sfax", but "Sfaxien" → nothing.
 *
 * When several are named, the last one wins — an address ends with its
 * city, and earlier names are usually streets ("Route de Gabès, Sfax" is in
 * Sfax). At the same spot, the longer name wins ("Sidi Bouzid" over any
 * shorter name inside it).
 */
export function governorateIn(text: string | null | undefined): Governorate | undefined {
  if (!text) return undefined;
  const folded = ` ${fold(text).replace(/[^a-z0-9]+/g, ' ')} `;
  let best: { end: number; length: number; name: Governorate } | undefined;
  for (const [key, name] of NAMES) {
    const at = folded.lastIndexOf(` ${key} `);
    if (at < 0) continue;
    const end = at + key.length;
    if (!best || end > best.end || (end === best.end && key.length > best.length)) {
      best = { end, length: key.length, name };
    }
  }
  return best?.name;
}

/**
 * The governorate of a parcel's `recipientCity`, which the server writes as
 * "Governorate, Delegation" — "Kasserine, Mejel Bel Abbès" → "Kasserine".
 * Only the part before the first comma counts, matched loosely.
 */
export function governorateOfCity(recipientCity: string | null | undefined): Governorate | undefined {
  return governorateIn(recipientCity?.split(',')[0]);
}
