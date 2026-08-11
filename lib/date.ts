/** Maps the app's language code to a locale tag for `toLocaleDateString`/`toLocaleTimeString` — using `i18n.language` here instead of `undefined` (device locale) so displayed dates/times follow the driver's chosen in-app language even if it differs from the device's own locale. */
export function localeTag(language: string): string {
  return language === 'fr' ? 'fr-FR' : 'en-US';
}

/** Local calendar date key (`YYYY-MM-DD`) — deliberately not `toISOString()`, which converts to UTC and can roll the date over near midnight. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Inverse of `toDateKey` — parses as a local date, not UTC (unlike `new Date('YYYY-MM-DD')`, which can land on the wrong day near midnight in negative UTC offsets). */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Compact local date (`YYYYMMDD`) — used in real backend ID formats (e.g. "RS-20260715-0001"). */
export function toCompactDateKey(date: Date): string {
  return toDateKey(date).replace(/-/g, '');
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function addMonths(date: Date, count: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

export function addDays(date: Date, count: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + count);
  return d;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
