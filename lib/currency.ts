/**
 * Decimal formatting for everything the driver sees.
 *
 * Decimal numbers carry three digits after a DOT — money, distances and
 * weights — the client's rule ("50.000"), which is also what the agency's
 * web app prints ("10.000 TND") and how the backend stores money (millimes).
 * Percentages are the one exception, at two ("98.40%"). Whole counts
 * (parcels, stops, minutes) stay whole.
 *
 * A dot, never a comma: "10,000 TND" reads as ten thousand to anyone used to
 * English number grouping, and this is the amount a driver collects at the
 * door. The same in French and in English — only dates and times follow the
 * app's language.
 */
export const CURRENCY_DECIMALS = 3;
export const MEASURE_DECIMALS = 3;
export const PERCENT_DECIMALS = 2;

/** e.g. 4.6 -> "4.600". Use for distances, weights, percentages. */
export function formatDecimal(value: number, places: number = MEASURE_DECIMALS): string {
  return value.toFixed(places);
}

/** e.g. 10 -> "10.000 TND". Every amount of money in the app goes through here. */
export function formatCurrency(amount: number): string {
  return `${formatDecimal(amount, CURRENCY_DECIMALS)} TND`;
}

/** e.g. 98.4 -> "98.40%". Every percentage in the app goes through here. */
export function formatPercent(value: number): string {
  return `${formatDecimal(value, PERCENT_DECIMALS)}%`;
}
