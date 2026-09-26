/**
 * Decimal formatting for everything the driver sees.
 *
 * Every decimal number carries three digits after the comma — money,
 * distances, weights and percentages alike. That's the client's rule
 * ("50,000"), and it matches how the backend stores money (millimes).
 * Whole counts (parcels, stops, minutes) aren't decimals and stay whole.
 */
export const CURRENCY_DECIMALS = 3;
export const MEASURE_DECIMALS = 3;

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
