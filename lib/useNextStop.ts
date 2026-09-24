import { useMemo } from 'react';

import type { Job } from '../types';
import { useJobsByIds, useRouteOrder, useRunsheets } from './query';

/**
 * The stop the driver should head to now, and its place in the day's order.
 *
 * Only runsheets the driver has signed for count — a parcel on an unconfirmed
 * run isn't deliverable yet, matching the locked cards in Runsheets. Order is
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
    const workable = all.filter((r) => !(r.needsConfirmation && r.status !== 'VALIDE'));
    return {
      allStopIds: all.flatMap((r) => r.stopIds),
      workableStopIds: workable.flatMap((r) => r.stopIds),
    };
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
