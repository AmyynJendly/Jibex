import type { Job } from '../types';

/**
 * A list key for a parcel row that stays unique when the same parcel shows
 * up more than once.
 *
 * A parcel's id is its tracking number, and one parcel can sit on several
 * runsheets: every failed attempt puts it on a new run, so a parcel failed
 * three times is in History four times. Keyed by tracking number alone, React
 * warned about duplicate keys and could drop or repeat rows.
 *
 * `<runsheetId>-<parcelId>` names the row itself: this parcel on that run.
 * Mock parcels have neither id and fall back to the tracking number.
 */
export function parcelRowKey(job: Job): string {
  const runsheetId = job.server?.runsheetId;
  const parcelId = job.server?.parcelId || job.id;
  return runsheetId ? `${runsheetId}-${parcelId}` : parcelId;
}

/**
 * One key per row, in order, guaranteed distinct — so no row is ever dropped,
 * even if the server sent the same parcel twice on one run.
 */
export function parcelRowKeys(jobs: readonly Job[]): string[] {
  const seen = new Map<string, number>();
  return jobs.map((job) => {
    const key = parcelRowKey(job);
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    return count === 1 ? key : `${key}#${count}`;
  });
}
