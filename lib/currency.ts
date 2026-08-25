/**
 * Decimal formatting for everything the driver sees.
 *
 * Money carries three digits because that's how the backend stores and the
 * agency reconciles it (millimes: 42,000 TND). Everything else — distances,
 * weights, rates — reads better at two, so that's the default here.
 */
export const CURRENCY_DECIMALS = 3;
export const MEASURE_DECIMALS = 2;

/** e.g. 4.6 -> "4,60". Use for distances, weights, percentages. */
export function formatDecimal(value: number, places: number = MEASURE_DECIMALS): string {
  return value.toFixed(places).replace('.', ',');
}

/**
 * Real backend format: comma decimal separator, "TND" suffix, always three
 * decimals — e.g. "250,000 TND". This stays the same regardless of UI
 * language: only dates/times follow the active locale, currency does not.
 */
export function formatCurrency(amount: number): string {
  return `${formatDecimal(amount, CURRENCY_DECIMALS)} TND`;
}
