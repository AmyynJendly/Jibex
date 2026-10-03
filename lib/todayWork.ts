import { dayRuns } from './runsheetDay';
import type { Runsheet } from '../types';

/**
 * Today's work, for Home's gauge and counters.
 *
 * Home used to count only the runs still open. The server stops listing a
 * run as active the moment the agency closes it, so after a full day's work
 * every number dropped to zero. Today's work is every parcel of today's
 * runs, whatever the run's status: the runs still open, plus the ones the
 * agency closed today.
 *
 * The rate is delivered ÷ (delivered + failed): of the parcels the driver
 * attempted, how many were delivered. Parcels still to do don't lower it.
 */
export interface TodayWork {
  delivered: number;
  failed: number;
  remaining: number;
  /** Every parcel of today's runs. */
  total: number;
  /** 0–100, not rounded: `formatPercent` prints it with two decimals. */
  ratePercent: number;
}

/**
 * @param runsheets   the driver's runs as the app lists them (the open ones)
 * @param closedToday runs the agency closed today, from the history request
 * @param today       local day, `YYYY-MM-DD`
 */
export function todayWork(runsheets: Runsheet[], closedToday: Runsheet[], today: string): TodayWork {
  const day = dayRuns(runsheets, closedToday, today);
  let delivered = 0;
  let failed = 0;
  let total = 0;
  for (const runsheet of [...day.open, ...day.closed]) {
    delivered += runsheet.deliveredCount;
    failed += runsheet.failedCount ?? 0;
    total += runsheet.stopCount;
  }
  const attempted = delivered + failed;
  return {
    delivered,
    failed,
    remaining: Math.max(0, total - attempted),
    total,
    ratePercent: attempted === 0 ? 0 : (delivered / attempted) * 100,
  };
}
