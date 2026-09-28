/**
 * Decimal formatting for everything the driver sees.
 *
 * Decimal numbers carry three digits after the comma — money, distances
 * and weights — the client's rule ("50,000"), which matches how the backend
 * stores money (millimes). Percentages are the one exception, at two
 * ("98,40%"). Whole counts (parcels, stops, minutes) stay whole.
 */
export const CURRENCY_DECIMALS = 3;
export const MEASURE_DECIMALS = 3;
export const PERCENT_DECIMALS = 2;

/** e.g. 4.6 -> "4,600". Use for distances, weights, percentages. */
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

/** e.g. 98.4 -> "98,40%". Every percentage in the app goes through here. */
export function formatPercent(value: number): string {
  return `${formatDecimal(value, PERCENT_DECIMALS)}%`;
}
