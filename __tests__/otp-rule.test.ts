/**
 * When the customer's code (OTP) is required — the rule from Jihed:
 * itemValue = price − deliveryFee (missing fee → 0); OTP when itemValue == 0.
 */
jest.mock('expo-secure-store', () => ({
  setItemAsync: async () => {},
  getItemAsync: async () => null,
  deleteItemAsync: async () => {},
}));

import { cashDue, cashDueFor, itemValue, otpRequired, otpRequiredFor } from '../lib/otpRule';
import { toJob } from '../services/real-api';

describe('the OTP rule', () => {
  it('0 / 0: nothing to collect → OTP', () => {
    expect(itemValue(0, 0)).toBe(0);
    expect(otpRequired({ price: 0, deliveryFee: 0 })).toBe(true);
  });

  it('10 / 10: only the delivery fee → OTP', () => {
    expect(itemValue(10, 10)).toBe(0);
    expect(otpRequired({ price: 10, deliveryFee: 10 })).toBe(true);
  });

  it('950 / 10: goods to pay for → normal delivery', () => {
    expect(itemValue(950, 10)).toBe(940);
    expect(otpRequired({ price: 950, deliveryFee: 10 })).toBe(false);
  });

  it('fee null: counts as 0', () => {
    expect(itemValue(10, null)).toBe(10);
    expect(otpRequired({ price: 10, deliveryFee: null })).toBe(false);
    expect(otpRequired({ price: 10 })).toBe(false);
    // Price 0 with no fee at all is still "nothing to collect".
    expect(otpRequired({ price: 0, deliveryFee: null })).toBe(true);
    expect(otpRequired({ price: 0 })).toBe(true);
    expect(otpRequired({})).toBe(true);
  });

  it('is not fooled by decimals: 7.5 / 7.5, and 0.1 + 0.2 against 0.3', () => {
    expect(otpRequired({ price: 7.5, deliveryFee: 7.5 })).toBe(true);
    expect(otpRequired({ price: 0.1 + 0.2, deliveryFee: 0.3 })).toBe(true);
    // One millime of goods is still goods.
    expect(otpRequired({ price: 10.001, deliveryFee: 10 })).toBe(false);
  });

  it('a price below the fee is not "zero": normal delivery', () => {
    expect(otpRequired({ price: 5, deliveryFee: 10 })).toBe(false);
  });
});

describe('what the driver collects', () => {
  it('0 / 0: nothing', () => {
    expect(cashDue({ price: 0, deliveryFee: 0 })).toEqual({ kind: 'nothing', amount: 0 });
    expect(cashDue({ price: 0 })).toEqual({ kind: 'nothing', amount: 0 });
  });

  it('10 / 10: the delivery fee, in cash', () => {
    expect(cashDue({ price: 10, deliveryFee: 10 })).toEqual({ kind: 'feeOnly', amount: 10 });
  });

  it('otherwise: the full price, unchanged', () => {
    expect(cashDue({ price: 950, deliveryFee: 10 })).toEqual({ kind: 'price', amount: 950 });
    expect(cashDue({ price: 12, deliveryFee: null })).toEqual({ kind: 'price', amount: 12 });
  });
});

describe('on a parcel from the real server', () => {
  const parcel = (price: number | null, deliveryFee: number | null) =>
    toJob({ id: 1, trackingNumber: 'TUN-100-00000001', status: 'EN_COURS', recipientName: 'TEST', price, deliveryFee });

  it('reads the price and the fee the server sends', () => {
    expect(otpRequiredFor(parcel(0, 0))).toBe(true);
    expect(otpRequiredFor(parcel(10, 10))).toBe(true);
    expect(otpRequiredFor(parcel(950, 10))).toBe(false);
    expect(otpRequiredFor(parcel(10, null))).toBe(false);
    expect(cashDueFor(parcel(10, 10))).toEqual({ kind: 'feeOnly', amount: 10 });
  });

  it('the live test parcels (price 10, fee 0 or missing) stay normal deliveries', () => {
    expect(otpRequiredFor(parcel(10, 0))).toBe(false);
    expect(parcel(10, 8).deliveryFee).toBe(8);
  });
});
