import type { Job } from '../types';

/**
 * Which attempt each History row was.
 *
 * One parcel can be in History several times: every failed attempt puts it on
 * a new run. The server keeps one count for the parcel (`deliveryAttempts`,
 * the attempts that failed), not one per run — so every row of that parcel
 * would show the same number. This works each row's own number out:
 *
 *  - the parcel's rows are put in time order (run day, then run id);
 *  - the oldest is attempt 1, the next 2, and so on;
 *  - if the server counted more failures than this driver's rows show (other
 *    drivers tried too), the numbering starts higher, so the latest row still
 *    lines up with the server's count.
 *
 * @returns one attempt number per row, in the rows' own order.
 */
export function historyAttempts(jobs: readonly Job[]): number[] {
  const groups = new Map<string, number[]>();
  jobs.forEach((job, index) => {
    const key = job.server?.parcelId || job.id;
    const rows = groups.get(key);
    if (rows) rows.push(index);
    else groups.set(key, [index]);
  });

  const attempts = new Array<number>(jobs.length).fill(1);
  for (const rows of groups.values()) {
    // History lists the newest run first, so with no date the later row is older.
    const oldestFirst = [...rows].sort((a, b) => {
      const byDay = (jobs[a].run?.date ?? '').localeCompare(jobs[b].run?.date ?? '');
      if (byDay) return byDay;
      const byRun = Number(jobs[a].server?.runsheetId ?? NaN) - Number(jobs[b].server?.runsheetId ?? NaN);
      return Number.isFinite(byRun) && byRun !== 0 ? byRun : b - a;
    });
    const failedHere = rows.filter((index) => jobs[index].status === 'FAILED').length;
    const counted = Math.max(0, ...rows.map((index) => jobs[index].deliveryAttempts ?? 0));
    const before = Math.max(0, counted - failedHere);
    oldestFirst.forEach((index, position) => {
      attempts[index] = before + position + 1;
    });
  }
  return attempts;
}

/** "02/10" from `2026-10-02`. */
export function shortDay(day: string | undefined): string | undefined {
  const match = day ? /^(\d{4})-(\d{2})-(\d{2})/.exec(day) : null;
  return match ? `${match[3]}/${match[2]}` : undefined;
}

/**
 * The line that tells History rows apart:
 * "RS-20261002-0002 · 02/10 · Tentative 4". Parts the row doesn't have are
 * left out.
 */
export function historyRecordLine(job: Job, attemptLabel: string): string {
  return [job.run?.code, shortDay(job.run?.date), attemptLabel].filter(Boolean).join(' · ');
}
