import { normalizeCode } from './scanSession';

/**
 * Checking a batch of parcels one by one before signing for it.
 *
 * A pickup and a transfer both hand the driver a list of parcels. On the
 * server, one tap completes either — no scan, no count — so nothing records
 * that the driver really holds each parcel. The app asks for the check
 * itself: every parcel is scanned (or, for a pickup, ticked) before the
 * button that tells the server is enabled.
 *
 * The check lives on the phone only, in memory: it is the driver's own
 * verification, sent nowhere, and it matters for the few minutes between
 * opening the list and pressing the button. Keyed by what is being checked,
 * so the scanner screen and the list screen share it.
 */
export const checklistKey = {
  pickup: (id: string) => `pickup:${id}`,
  transfer: (id: string) => `transfer:${id}`,
};

const EMPTY: ReadonlySet<string> = new Set();
const lists = new Map<string, ReadonlySet<string>>();
const listeners = new Set<() => void>();

function publish(key: string, next: ReadonlySet<string>) {
  lists.set(key, next);
  listeners.forEach((listener) => listener());
}

export function subscribeChecklists(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The codes checked so far. The same object until something changes, so it can back a store hook. */
export function checkedOf(key: string): ReadonlySet<string> {
  return lists.get(key) ?? EMPTY;
}

export function setChecked(key: string, code: string, checked: boolean) {
  const normalized = normalizeCode(code);
  const current = checkedOf(key);
  if (current.has(normalized) === checked) return;
  const next = new Set(current);
  if (checked) next.add(normalized);
  else next.delete(normalized);
  publish(key, next);
}

/** Tick every parcel at once — for a merchant handing over hundreds, where one by one isn't practical. */
export function checkAll(key: string, codes: readonly string[]) {
  publish(key, new Set(codes.map(normalizeCode)));
}

export function clearChecklist(key: string) {
  if (lists.has(key)) publish(key, EMPTY);
}

export interface CheckProgress {
  done: number;
  total: number;
  /** Every listed parcel is checked (and there is at least one). */
  complete: boolean;
  /** The parcels still to check, as listed. */
  missing: string[];
}

/** Where the check stands. Only listed parcels count: a stray tick for something else changes nothing. */
export function checkProgress(expected: readonly string[], checked: ReadonlySet<string>): CheckProgress {
  const missing = expected.filter((code) => !checked.has(normalizeCode(code)));
  const total = expected.length;
  return { done: total - missing.length, total, complete: total > 0 && missing.length === 0, missing };
}

export type CheckVerdict =
  /** In the list, and now checked. */
  | 'checked'
  /** In the list, checked before. */
  | 'already'
  /** Not in this list at all. */
  | 'unknown';

/** A code was scanned against the list: checks it when it belongs there. */
export function checkScan(key: string, expected: readonly string[], code: string): CheckVerdict {
  const normalized = normalizeCode(code);
  if (!expected.some((item) => normalizeCode(item) === normalized)) return 'unknown';
  if (checkedOf(key).has(normalized)) return 'already';
  setChecked(key, normalized, true);
  return 'checked';
}
