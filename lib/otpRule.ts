/**
 * When a delivery needs the customer's code (OTP), and what cash is due.
 *
 * The rule (from Jihed):
 *
 *     itemValue = price − deliveryFee      (a missing fee counts as 0)
 *     OTP required when itemValue == 0
 *
 * That covers both cases with nothing of value to collect for the sender:
 *  - price 0 and fee 0: nothing to collect at all;
 *  - price == fee: only the delivery fee is collected.
 * With no cash for the goods changing hands, the code is the proof that the
 * parcel reached the right person. Every other parcel is a normal delivery.
 *
 * `price` is what the customer pays at the door — `Job.cashToCollect`.
 */
import type { TFunction } from 'i18next';

import { formatCurrency } from './currency';

/** Money is stored to the millime: two amounts closer than this are the same amount. */
const MILLIME = 0.0005;

const amount = (value: number | null | undefined) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

/** What the goods themselves are worth to collect: the price without the delivery fee. */
export function itemValue(price: number | null | undefined, deliveryFee: number | null | undefined): number {
  return amount(price) - amount(deliveryFee);
}

/** True when the delivery can only be confirmed with the customer's code. */
export function otpRequired(parcel: { price?: number | null; deliveryFee?: number | null }): boolean {
  return Math.abs(itemValue(parcel.price, parcel.deliveryFee)) < MILLIME;
}

/** What the driver collects at the door. */
export type CashDue =
  /** Nothing: price 0 and fee 0. */
  | { kind: 'nothing'; amount: 0 }
  /** Only the delivery fee, in cash. */
  | { kind: 'feeOnly'; amount: number }
  /** The full price, as before. */
  | { kind: 'price'; amount: number };

export function cashDue(parcel: { price?: number | null; deliveryFee?: number | null }): CashDue {
  const price = amount(parcel.price);
  const fee = amount(parcel.deliveryFee);
  if (!otpRequired(parcel)) return { kind: 'price', amount: price };
  return fee > MILLIME ? { kind: 'feeOnly', amount: fee } : { kind: 'nothing', amount: 0 };
}

/**
 * The cash line on the delivery screen, as one sentence:
 *  - nothing:  "Rien à encaisser"
 *  - fee only: "À encaisser : 10.000 TND (frais de livraison)"
 *  - price:    "À encaisser : 950.000 TND"
 */
export function cashDueLine(t: TFunction, due: CashDue): string {
  if (due.kind === 'nothing') return t('cash.nothing');
  const line = t('cash.toCollect', { amount: formatCurrency(due.amount) });
  return due.kind === 'feeOnly' ? line + ' ' + t('cash.feeOnlyNote') : line;
}

/** The same two questions asked of a parcel as the app holds it. */
export function otpRequiredFor(job: { cashToCollect: number; deliveryFee?: number }): boolean {
  return otpRequired({ price: job.cashToCollect, deliveryFee: job.deliveryFee });
}

export function cashDueFor(job: { cashToCollect: number; deliveryFee?: number }): CashDue {
  return cashDue({ price: job.cashToCollect, deliveryFee: job.deliveryFee });
}
