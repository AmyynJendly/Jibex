import type { TFunction } from 'i18next';

import type { JobStatus } from '../types';
import { enumLabel } from './enumLabel';

/**
 * Every parcel status the server can send, in one place: what the app counts
 * it as (one of our four parcel states) and, through `enums.parcelStatus`,
 * the words the agency's web app uses for it.
 *
 * The codes are the server's own. The list is the web app's full status list
 * plus IN_WAREHOUSE, which only its Dépôt page sends.
 */
const PARCEL_STATUS: Readonly<Record<string, JobStatus>> = {
  // Not yet with the delivery company, or just arrived.
  CREATED: 'PENDING',
  PENDING: 'PENDING',
  A_ENLEVER: 'PENDING',
  PICKUP: 'PENDING',
  PICKED_UP: 'PENDING',
  SCANNED: 'PENDING',
  // Waiting for the after-sales desk to decide (after repeated failures).
  A_VERIFIER: 'PENDING',

  // In a depot, or moving.
  AU_DEPOT: 'IN_TRANSIT',
  AU_DEPOT_RELAIS: 'IN_TRANSIT',
  AU_DEPOT_DESTINATION: 'IN_TRANSIT',
  IN_WAREHOUSE: 'IN_TRANSIT',
  EN_TRANSIT_AGENCE: 'IN_TRANSIT',
  IN_TRANSIT: 'IN_TRANSIT',
  EN_COURS: 'IN_TRANSIT',
  OUT_FOR_DELIVERY: 'IN_TRANSIT',
  DELAYED: 'IN_TRANSIT',

  DELIVERED: 'DELIVERED',
  LIVRE_PAYE: 'DELIVERED',

  // Coming back, or closed without a delivery.
  RTN_DEPOT: 'FAILED',
  RETOUR_A_CHARGER: 'FAILED',
  EN_TRANSIT_RETOUR: 'FAILED',
  RETOUR_CLIENT_AGENCE: 'FAILED',
  RETOUR_EXPEDITEUR: 'FAILED',
  RETOUR_RECU: 'FAILED',
  RETOUR_DEFINITIF: 'FAILED',
  RETURNED: 'FAILED',
  CANCELLED: 'FAILED',
  LOST: 'FAILED',
};

export const PARCEL_STATUS_CODES = Object.keys(PARCEL_STATUS);

/** What the app counts this parcel status as, or null for one it doesn't know. */
export function jobStatusOfParcel(status: string | null | undefined): JobStatus | null {
  return (status && PARCEL_STATUS[status]) || null;
}

/** The parcel status in the agency's words, e.g. "À vérifier (SAV)". An unknown code is shown readable, never raw. */
export function parcelStatusLabel(t: TFunction, status: string): string {
  return enumLabel(t, 'parcelStatus', status);
}

/**
 * The parcel statuses the ribbon on a card already says ("In transit",
 * "Delivered"). Anything else tells the driver something more — the parcel
 * went back to the depot, is with the after-sales desk, is at a relay depot —
 * and is shown next to it.
 */
const SAID_BY_THE_RIBBON = new Set(['PENDING', 'EN_COURS', 'OUT_FOR_DELIVERY', 'IN_TRANSIT', 'DELIVERED']);

/** The parcel's own status when it's worth showing beside the card's state, else undefined. */
export function notableParcelStatus(status: string | null | undefined): string | undefined {
  if (!status || SAID_BY_THE_RIBBON.has(status)) return undefined;
  return status;
}
