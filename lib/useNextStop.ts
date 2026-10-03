import { useMemo } from 'react';

import type { Job } from '../types';
import { useJobsByIds, useRouteOrder, useRunsheets } from './query';
import { lockedStopIds } from './runsheetDay';

/**
 * The stop the driver should head to now, and its place in the day's order.
 *
 * Locked parcels don't count — a run not accepted yet, or a parcel just added
 * to a started run — matching the locked cards in Runsheets. Order is
 * the same one Runsheets shows (nearest-first or the driver's own drag), and
 * an in-transit parcel goes before a pending one.
 *
 * Reads the same cached queries as Home, so the next-stop card and the bar
 * above the tabs can't disagree and nothing is fetched twice.
 */
export function useNextStop(): { nextStop: Job | null; index: number } {
  const runsheets = useRunsheets().data;

  const { allStopIds, workableStopIds } = useMemo(() => {
    const all = runsheets ?? [];
    const locked = lockedStopIds(all);
    const allStopIds = all.flatMap((r) => r.stopIds);
    return { allStopIds, workableStopIds: allStopIds.filter((id) => !locked.has(id)) };
  }, [runsheets]);

  const jobs = useJobsByIds(allStopIds).data;
  const orderedIds = useRouteOrder(workableStopIds).data;

  return useMemo(() => {
    const byId = new Map((jobs ?? []).map((job) => [job.id, job] as const));
    const ordered = (orderedIds ?? [])
      .map((id) => byId.get(id))
      .filter((job): job is Job => !!job);
    const nextStop =
      ordered.find((job) => job.status === 'IN_TRANSIT') ??
      ordered.find((job) => job.status === 'PENDING') ??
      null;
    return { nextStop, index: nextStop ? (orderedIds ?? []).indexOf(nextStop.id) + 1 : 0 };
  }, [jobs, orderedIds]);
}
