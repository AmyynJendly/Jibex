import type { Pickup, Return, Runsheet, Transfer } from '../types';

/**
 * The counts on Home's four buttons — what is waiting behind each one, so the
 * driver doesn't have to open a screen to find out. Like the Android
 * dashboard: open runs, pickups still to do, open transfers, returns still
 * with the driver. Finished things never count.
 */
export interface HomeBadges {
  runsheets: number;
  pickups: number;
  transfers: number;
  returns: number;
}

export function homeBadges(lists: {
  runsheets?: readonly Runsheet[] | null;
  pickups?: readonly Pickup[] | null;
  transfers?: readonly Transfer[] | null;
  returns?: readonly Return[] | null;
}): HomeBadges {
  return {
    runsheets: (lists.runsheets ?? []).filter((run) => run.status !== 'VALIDE').length,
    pickups: (lists.pickups ?? []).filter((pickup) => pickup.status === 'SCHEDULED').length,
    transfers: (lists.transfers ?? []).filter((transfer) => transfer.status === 'IN_PROGRESS').length,
    returns: (lists.returns ?? []).filter((item) => item.status === 'PENDING_PICKUP').length,
  };
}

/** What the badge prints: nothing at zero, "99+" past two digits. */
export function badgeText(count: number): string | null {
  if (!Number.isFinite(count) || count <= 0) return null;
  return count > 99 ? '99+' : String(Math.floor(count));
}
