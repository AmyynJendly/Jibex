/**
 * Tunisia's 24 governorates — the same list the backend uses (its
 * `TunisianCity` enum). Used to spot a city in a free-text address when the
 * server leaves the city field empty (every pickup's `pickupCity` is null).
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

/** Other spellings seen in addresses, mapped to the governorate's own name. */
const ALIASES: Record<string, string> = { kef: 'Le Kef', 'el kef': 'Le Kef' };

const fold = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const NAMES: [string, string][] = [
  ...GOVERNORATES.map((name) => [fold(name), name] as [string, string]),
  ...Object.entries(ALIASES),
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
export function governorateIn(text: string | null | undefined): string | undefined {
  if (!text) return undefined;
  const folded = ` ${fold(text).replace(/[^a-z0-9]+/g, ' ')} `;
  let best: { end: number; length: number; name: string } | undefined;
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
