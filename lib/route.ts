import type { GeoPoint, Job } from '../types';
import { haversineKm } from './geo';

/**
 * Greedy nearest-neighbour stop order — good enough for a same-day local
 * route, not a true travelling-salesman solve.
 *
 * Stops without coordinates can't be placed by distance, so they keep the
 * order they arrived in and follow the ones that can. On the real server
 * that's most parcels today, which is why the list falls back to dispatch's
 * sequence rather than a nonsense "nearest" order.
 */
export function nearestNeighborOrder<T extends Pick<Job, 'location'>>(jobs: T[], start: GeoPoint): T[] {
  const remaining = jobs.filter((job) => job.location);
  const unplaced = jobs.filter((job) => !job.location);
  const ordered: T[] = [];
  let current = start;

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDist = Infinity;
    remaining.forEach((job, i) => {
      const d = haversineKm(current, job.location!);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIndex = i;
      }
    });
    const [next] = remaining.splice(nearestIndex, 1);
    ordered.push(next);
    current = next.location!;
  }

  return [...ordered, ...unplaced];
}
