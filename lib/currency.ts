/**
 * Real backend format: comma decimal separator, always two decimals, "TND"
 * suffix — e.g. "250,00 TND". This stays the same regardless of UI
 * language (see Part B, requirement 7): only dates/times follow the active
 * locale, currency does not.
 */
export function formatCurrency(amount: number): string {
  return `${amount.toFixed(2).replace('.', ',')} TND`;
}
