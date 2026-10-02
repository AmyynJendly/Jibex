/**
 * Numbers the driver reads: three decimals after a dot, the way the agency's
 * web app prints them. "10,000 TND" (a comma) read as ten thousand in the
 * live test, on the amount the driver collects at the door.
 */
import { formatCurrency, formatDecimal, formatPercent } from '../lib/currency';

describe('money', () => {
  it('shows three decimals after a dot, then TND', () => {
    expect(formatCurrency(10)).toBe('10.000 TND');
    expect(formatCurrency(42.5)).toBe('42.500 TND');
    expect(formatCurrency(102.98)).toBe('102.980 TND');
    expect(formatCurrency(0)).toBe('0.000 TND');
  });

  it('never uses a comma, whatever the amount', () => {
    for (const amount of [0, 0.5, 10, 999.999, 1000, 2500, 123456.789]) {
      expect(formatCurrency(amount)).not.toContain(',');
    }
    // No thousands separator either: 2500 dinars is "2500.000", not "2,500.000".
    expect(formatCurrency(2500)).toBe('2500.000 TND');
  });
});

describe('other decimals', () => {
  it('distances and weights carry three decimals after a dot', () => {
    expect(formatDecimal(4.6)).toBe('4.600');
    expect(formatDecimal(12)).toBe('12.000');
  });

  it('percentages carry two', () => {
    expect(formatPercent(98.4)).toBe('98.40%');
  });
});
