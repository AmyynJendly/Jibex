/**
 * The date filter on the History views of Pickups, Transfers and Returns.
 *
 * Every item in those histories has the same status (collected, completed,
 * processed), so a status filter would have nothing to choose between — when
 * it happened is what tells them apart.
 */
export type DateFilter = 'all' | 'today' | 'week';

export const DATE_FILTERS: readonly DateFilter[] = ['all', 'today', 'week'];

function startOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Whether something that happened at `iso` passes the filter. "week" is the
 * last seven days, today included. An item with no usable date only shows
 * under "all" — it can't honestly be placed in a range.
 */
export function matchesDateFilter(iso: string | undefined, filter: DateFilter, now = new Date()): boolean {
  if (filter === 'all') return true;
  const time = iso ? Date.parse(iso) : NaN;
  if (Number.isNaN(time)) return false;
  const today = startOfDay(now);
  if (filter === 'today') return time >= today;
  return time >= today - 6 * 24 * 60 * 60 * 1000;
}
