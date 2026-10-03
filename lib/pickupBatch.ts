import { formatDayMonth } from './date';
import type { Pickup } from '../types';

/** What "Terminer tous les pickups" would close: the pickups still to do, and their parcels. */
export interface PickupBatch {
  ids: string[];
  /** N in "Terminer N pickups (M colis) ?". */
  count: number;
  /** M — every parcel on those pickups. */
  parcels: number;
}

export function pickupBatch(pickups: Pick<Pickup, 'id' | 'status' | 'packageCount'>[]): PickupBatch {
  const open = pickups.filter((pickup) => pickup.status === 'SCHEDULED');
  return {
    ids: open.map((pickup) => pickup.id),
    count: open.length,
    parcels: open.reduce((sum, pickup) => sum + pickup.packageCount, 0),
  };
}

/** How many of a pickup's parcels are drawn at first, and added per "show more". */
export const PARCELS_PAGE = 30;

/**
 * The parcels to draw for an opened pickup. A big sender can hand over
 * hundreds of parcels; drawing them all at once inside the card froze the
 * list. The first page is drawn, the rest on demand.
 */
export function parcelPage<T>(parcels: readonly T[], shown: number): { visible: T[]; hidden: number } {
  const visible = parcels.slice(0, Math.max(0, shown));
  return { visible, hidden: parcels.length - visible.length };
}

/** The agency's own reference for a pickup ("PU-3-20261002-0001") — what it says on the phone. */
export function pickupReference(pickup: Pick<Pickup, 'id' | 'server'>): string | undefined {
  const reference = pickup.server?.requestNumber ?? pickup.id;
  // The server's bare numeric id means nothing to a driver.
  return /^\d+$/.test(reference) ? undefined : reference;
}

/** "02/10 · 23:13": a time alone says nothing in a list that spans days. */
export function pickupWhen(pickup: Pick<Pickup, 'requestedByDate' | 'timeWindow'>): string {
  return [formatDayMonth(pickup.requestedByDate), pickup.timeWindow].filter(Boolean).join(' · ');
}
