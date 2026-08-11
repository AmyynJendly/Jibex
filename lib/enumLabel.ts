import type { TFunction } from 'i18next';

/** "SOME_VALUE" -> "Some value" — used only as a last-resort fallback below. */
function humanize(value: string): string {
  const lower = value.toLowerCase().replace(/_/g, ' ');
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Resolves a raw backend enum value (e.g. "REFUSED") to its translated
 * label via `enums.<namespace>.<value>`. If the backend ships a value we
 * don't have a translation for, this falls back to a humanized version of
 * the raw value instead of leaking the raw enum string or crashing — see
 * Part A, requirement 4.
 */
export function enumLabel(t: TFunction, namespace: string, value: string): string {
  return t(`enums.${namespace}.${value}` as never, { defaultValue: humanize(value) });
}
