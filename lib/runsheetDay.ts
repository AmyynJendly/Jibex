import type { Runsheet } from '../types';

/**
 * Where a run stands, in the driver's words. A driver normally has ONE run
 * per day, so the Current tab is about that run — not about loose parcels.
 *
 *  - `toConfirm`  — given by the agency, not accepted yet
 *  - `modified`   — accepted, then the agency changed its parcels
 *  - `toStart`    — accepted, but the run didn't start
 *  - `inProgress` — being delivered
 *  - `done`       — every parcel was attempted; the agency hasn't closed it
 *  - `closed`     — closed by the agency ("Valider la tournée" on the web)
 */
export type RunStage = 'toConfirm' | 'modified' | 'toStart' | 'inProgress' | 'done' | 'closed';

/**
 * @param openCount how many of the run's parcels are still to deliver, when
 *   the caller knows it. Left out, a run being worked is "in progress".
 */
export function runStage(
  runsheet: Pick<Runsheet, 'status' | 'needsStart' | 'needsConfirmation' | 'stopCount'>,
  openCount?: number
): RunStage {
  if (runsheet.status === 'VALIDE') return 'closed';
  if (runsheet.needsStart) return 'toStart';
  if (runsheet.status === 'A_CONFIRMER') return 'toConfirm';
  if (runsheet.needsConfirmation) return 'modified';
  if (openCount === 0 && runsheet.stopCount > 0) return 'done';
  return 'inProgress';
}

/** The status in plain words — an i18n key under `runsheets.day.status`. */
export function runStatusKey(stage: RunStage): string {
  // A modified run waits on the driver exactly like a new one.
  return `runsheets.day.status.${stage === 'modified' ? 'toConfirm' : stage}`;
}

/** The run is for that day (`YYYY-MM-DD`), or — with no day of its own — was closed on it. */
export function isRunForDay(runsheet: Pick<Runsheet, 'scheduledDate' | 'closedAt'>, day: string): boolean {
  if (runsheet.scheduledDate) return runsheet.scheduledDate === day;
  return !!runsheet.closedAt && runsheet.closedAt.slice(0, 10) === day;
}

/** A run closed today still belongs on today's screen, whichever day it was planned for. */
function closedOnDay(runsheet: Pick<Runsheet, 'scheduledDate' | 'closedAt'>, day: string): boolean {
  return isRunForDay(runsheet, day) || (!!runsheet.closedAt && runsheet.closedAt.slice(0, 10) === day);
}

export interface DayRuns {
  /** Runs still open, today's first. Normally one. */
  open: Runsheet[];
  /** Runs the agency closed today — shown only when nothing is open. */
  closed: Runsheet[];
}

/**
 * What the Current tab shows.
 *
 * @param runsheets   the driver's runs as the app lists them (open ones; on
 *                    mock data, closed ones too)
 * @param closedToday runs the agency closed, from the history endpoint
 * @param today       local day, `YYYY-MM-DD`
 */
export function dayRuns(runsheets: Runsheet[], closedToday: Runsheet[], today: string): DayRuns {
  const open = runsheets
    .filter((runsheet) => runsheet.status !== 'VALIDE')
    .map((runsheet, index) => ({ runsheet, index }))
    .sort((a, b) => {
      const aToday = isRunForDay(a.runsheet, today) ? 0 : 1;
      const bToday = isRunForDay(b.runsheet, today) ? 0 : 1;
      if (aToday !== bToday) return aToday - bToday;
      // Then the most recent day first; runs with no day keep their place.
      const byDay = (b.runsheet.scheduledDate ?? '').localeCompare(a.runsheet.scheduledDate ?? '');
      return byDay || a.index - b.index;
    })
    .map(({ runsheet }) => runsheet);

  const seen = new Set<string>();
  const closed = [...runsheets.filter((runsheet) => runsheet.status === 'VALIDE'), ...closedToday].filter(
    (runsheet) => {
      if (runsheet.status !== 'VALIDE' || !closedOnDay(runsheet, today) || seen.has(runsheet.id)) return false;
      seen.add(runsheet.id);
      return true;
    }
  );

  return { open, closed };
}
