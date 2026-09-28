import type { IconName } from '../components/Icon';
import type { DeliveryFailureReason } from '../types';

/**
 * Every failure reason the backend knows, in one place.
 *
 * The values are the backend's own enum names and are stored and sent
 * exactly as written — the server parses them by name, and once a name has
 * been used it is never renamed or removed, or older parcels would stop
 * parsing. What the driver reads is the translated label under
 * `enums.failureReason.<NAME>`.
 *
 * `selectable: false` marks reasons the business has retired from the
 * driver's picker (merged into CANCELLED_BY_CLIENT) — still valid, and still
 * labelled, on parcels that were recorded with them before.
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
  { value: 'PARCEL_POSTPONED', group: 'customer', icon: 'time-outline', selectable: true, common: false },
  { value: 'UNRELIABLE_CLIENT', group: 'customer', icon: 'alert-circle-outline', selectable: true, common: false },
  { value: 'REFUSED', group: 'customer', icon: 'close-circle-outline', selectable: false, common: false },
  { value: 'NOT_INTERESTED_2ND_ATTEMPT', group: 'customer', icon: 'thumbs-down-outline', selectable: false, common: false },
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

export const FAILURE_REASON_GROUPS: readonly FailureReasonGroup[] = [
  'reach',
  'customer',
  'address',
  'order',
  'other',
];

/** The reasons a driver can pick from. */
export const SELECTABLE_REASONS = FAILURE_REASONS.filter((reason) => reason.selectable);

/** The most-picked reasons, for the top of the picker and the quick sheet. */
export const COMMON_REASONS = SELECTABLE_REASONS.filter((reason) => reason.common);

/** OTHER says nothing on its own, so it can't be confirmed without a note. */
export function reasonNeedsNote(reason: DeliveryFailureReason | null | undefined): boolean {
  return reason === 'OTHER';
}
