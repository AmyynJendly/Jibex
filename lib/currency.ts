/**
 * Every decimal the app displays — currency, weights, distances, rates —
 * shows exactly three digits after the separator, using a comma (the
 * Tunisian/French convention the backend already returns). Keeping this in
 * one place is what makes "3 decimals everywhere" a single-line change
 * rather than a hunt through every screen.
 */
export const DECIMAL_PLACES = 3;

/** e.g. 4.6 -> "4,600". Use for any float rendered to the driver. */
export function formatDecimal(value: number): string {
  return value.toFixed(DECIMAL_PLACES).replace('.', ',');
}

/**
 * Real backend format: comma decimal separator, "TND" suffix — e.g.
 * "250,000 TND". This stays the same regardless of UI language: only
 * dates/times follow the active locale, currency does not.
 */
export function formatCurrency(amount: number): string {
  return `${formatDecimal(amount)} TND`;
}
