import type { GeoPoint, Job } from '../types';
import { haversineKm } from './geo';
import { GOVERNORATE_CENTERS, governorateIn, type Governorate } from './governorates';

/**
 * Greedy nearest-neighbour stop order — good enough for a same-day local
 * route, not a true travelling-salesman solve. Used where every stop has
 * exact coordinates (the next-stop hint on mock data).
 *
 * Stops without coordinates can't be placed by distance, so they keep the
 * order they arrived in and follow the ones that can.
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

/** A stop's governorate: the one the server named, else one found in its address. */
export function governorateOfJob(job: Pick<Job, 'governorate' | 'address'>): Governorate | undefined {
  return governorateIn(job.governorate) ?? governorateIn(job.address);
}

/**
 * "Nearest first" without the server's coordinates: each stop is placed at
 * its exact location when it has one, otherwise at the centre of its
 * governorate, and the list is sorted by distance from the driver.
 *
 *  - Stops in the same governorate are the same distance away, and the sort
 *    is stable, so they keep the order they came in (dispatch's).
 *  - Stops whose governorate is unknown go last, in their incoming order.
 *  - Each placed stop gets `distanceKm`, and `distanceApprox` when it was
 *    measured to a governorate centre.
 */
export function nearestFirstByArea<T extends Job>(jobs: T[], driver: GeoPoint): T[] {
  const placed: { job: T; km: number; index: number }[] = [];
  const unknown: T[] = [];
  jobs.forEach((job, index) => {
    const governorate = governorateOfJob(job);
    const point = job.location ?? (governorate ? GOVERNORATE_CENTERS[governorate] : undefined);
    if (!point) {
      unknown.push(job);
      return;
    }
    const km = haversineKm(driver, point);
    placed.push({ job: { ...job, distanceKm: km, distanceApprox: !job.location }, km, index });
  });
  placed.sort((a, b) => a.km - b.km || a.index - b.index);
  return [...placed.map(({ job }) => job), ...unknown];
}
