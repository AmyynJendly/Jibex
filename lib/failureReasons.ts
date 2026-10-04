import type { IconName } from '../components/Icon';
import type { DeliveryFailureReason } from '../types';

/**
 * Every failure reason the backend knows, in one place.
 *
 * The values are the backend's own enum names and are stored and sent
 * exactly as written — the server parses them by name, and once a name has
 * been used it is never renamed or removed, or older parcels would stop
 * parsing. What the driver reads is the translated label under
 * `enums.failureReason.<NAME>`, in the agency web app's own words.
 *
 * Which ones the driver is offered:
 *  - `selectable: false` hides a reason from the picker while keeping its
 *    label for parcels already recorded with it. Two are hidden, like in
 *    the Android app: REFUSED and NOT_INTERESTED_2ND_ATTEMPT. The business
 *    merged them into CANCELLED_BY_CLIENT ("Annulé par client") on
 *    13/08/2026 — that is the one the driver picks instead.
 *  - `fromAttempt: 2` offers a reason only on a second attempt or later
 *    (the parcel already failed once). It only matters for a selectable
 *    reason.
 */

export type FailureReasonGroup = 'reach' | 'customer' | 'address' | 'order' | 'other';

export interface FailureReasonInfo {
  value: DeliveryFailureReason;
  group: FailureReasonGroup;
  icon: IconName;
  /** Offered to the driver. */
  selectable: boolean;
  /** One of the handful drivers pick most — shown first, and in the quick sheet. */
  common: boolean;
  /** Offered only from this attempt on (2 = the parcel already failed once). */
  fromAttempt?: number;
}

export const FAILURE_REASONS: readonly FailureReasonInfo[] = [
  // Couldn't reach the customer
  { value: 'NO_ANSWER', group: 'reach', icon: 'volume-mute-outline', selectable: true, common: true },
  { value: 'PHONE_OFF', group: 'reach', icon: 'phone-portrait-outline', selectable: true, common: true },
  { value: 'LINE_BUSY', group: 'reach', icon: 'call-outline', selectable: true, common: false },
  { value: 'CALL_REFUSED', group: 'reach', icon: 'close-circle-outline', selectable: true, common: false },
  { value: 'WRONG_NUMBER_2ND_ATTEMPT', group: 'reach', icon: 'keypad-outline', selectable: true, common: false },
  // The customer
  { value: 'ABSENT', group: 'customer', icon: 'home-outline', selectable: true, common: true },
  { value: 'NOT_AVAILABLE_RESCHEDULED', group: 'customer', icon: 'calendar-outline', selectable: true, common: true },
  { value: 'CANCELLED_BY_CLIENT', group: 'customer', icon: 'ban-outline', selectable: true, common: true },
  { value: 'REFUSED', group: 'customer', icon: 'close-circle-outline', selectable: false, common: false },
  { value: 'PARCEL_POSTPONED', group: 'customer', icon: 'time-outline', selectable: true, common: false },
  { value: 'UNRELIABLE_CLIENT', group: 'customer', icon: 'alert-circle-outline', selectable: true, common: false },
  {
    value: 'NOT_INTERESTED_2ND_ATTEMPT',
    group: 'customer',
    icon: 'thumbs-down-outline',
    selectable: false,
    common: false,
    fromAttempt: 2,
  },
  // The address
  { value: 'WRONG_ADDRESS', group: 'address', icon: 'location-outline', selectable: true, common: true },
  { value: 'INCOMPLETE_ADDRESS', group: 'address', icon: 'map-outline', selectable: true, common: false },
  // The order
  { value: 'INCORRECT_AMOUNT', group: 'order', icon: 'cash-outline', selectable: true, common: false },
  { value: 'WRONG_PAYMENT_MODE', group: 'order', icon: 'card-outline', selectable: true, common: false },
  { value: 'NON_COMPLIANT_ORDER', group: 'order', icon: 'cube-outline', selectable: true, common: false },
  { value: 'DUPLICATE_ORDER', group: 'order', icon: 'copy-outline', selectable: true, common: false },
  { value: 'RETURN_CONFIRMED_BY_SENDER', group: 'order', icon: 'arrow-undo-outline', selectable: true, common: false },
  // Something else
  { value: 'FORCE_MAJEURE', group: 'other', icon: 'thunderstorm-outline', selectable: true, common: false },
  { value: 'OTHER', group: 'other', icon: 'ellipsis-horizontal-circle-outline', selectable: true, common: false },
];

export const FAILURE_REASON_GROUPS: readonly FailureReasonGroup[] = ['reach', 'customer', 'address', 'order', 'other'];

/**
 * The reasons a driver can pick for this parcel. `deliveryAttempts` is the
 * server's count of attempts that already failed (0 on a first attempt), so
 * the attempt in hand is one more.
 */
export function reasonsFor(deliveryAttempts: number | null | undefined): FailureReasonInfo[] {
  const attempt = (typeof deliveryAttempts === 'number' && deliveryAttempts > 0 ? Math.floor(deliveryAttempts) : 0) + 1;
  return FAILURE_REASONS.filter((reason) => reason.selectable && attempt >= (reason.fromAttempt ?? 1));
}

/** The most-picked reasons, for the top of the picker and the quick sheet. */
export function commonReasonsFor(deliveryAttempts: number | null | undefined): FailureReasonInfo[] {
  return reasonsFor(deliveryAttempts).filter((reason) => reason.common);
}

/**
 * The reason to show on a parcel: only when the parcel is failed. A pending
 * or delivered parcel never shows one, whatever the data still carries.
 */
export function shownFailureReason(job: {
  status: string;
  failureReason?: DeliveryFailureReason;
}): DeliveryFailureReason | undefined {
  return job.status === 'FAILED' ? job.failureReason : undefined;
}

/** OTHER says nothing on its own, so it can't be confirmed without a note. */
export function reasonNeedsNote(reason: DeliveryFailureReason | null | undefined): boolean {
  return reason === 'OTHER';
}
