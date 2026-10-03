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
