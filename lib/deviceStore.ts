import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * State that belongs to this phone, not to the server.
 *
 * The backend has no endpoint for any of it — a driver's own stop order, the
 * calls they placed, whether they sort by nearest-first — so it lives here,
 * and it survives the app being closed: a driver who spent five minutes
 * arranging their route, or who called a customer before the app was swiped
 * away, can't lose that on the next launch. The mock and the real API both
 * read from here.
 *
 * Everything is loaded into memory once (`hydrateDeviceStore`) and written
 * through on every change, so reads are synchronous and each change is on
 * disk before the call that made it resolves. AsyncStorage rather than the
 * secure store: none of this is secret, and a long call log or a big route
 * can outgrow the secure store's ~2 KB per value.
 */

const KEYS = {
  nearestFirst: 'jibex.device.nearestFirst.v1',
  stopRanks: 'jibex.device.stopRanks.v1',
  listOrders: 'jibex.device.listOrders.v1',
  callLog: 'jibex.device.callLog.v1',
  unreachable: 'jibex.device.unreachable.v1',
  hiddenNotifications: 'jibex.device.hiddenNotifications.v1',
  unreadNotifications: 'jibex.device.unreadNotifications.v1',
  failureLocations: 'jibex.device.failureLocations.v1',
  dispatchContact: 'jibex.device.dispatchContact.v1',
  recentSearches: 'jibex.device.recentSearches.v1',
} as const;

/** A call older than this is no longer evidence for any open parcel — dropped on load. */
const CALL_LOG_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Each stop's place in the driver's order, filed under its runsheet:
 * `{ [runsheetId]: { [stopId]: rank } }`. The Runsheets tab shows every
 * run's stops as one list, so the rank is the position in that list — it
 * keeps stops from different runs interleaved the way the driver left them —
 * while filing by runsheet means a finished run's entries go away with it.
 */
type StopRanks = Record<string, Record<string, number>>;

export type OrderedList = 'pickups' | 'transfers' | 'returns';
type ListOrders = Partial<Record<OrderedList, string[]>>;

/** Every call placed per parcel, oldest first, as ISO timestamps. */
type CallLog = Record<string, string[]>;

const state = {
  nearestFirst: true,
  stopRanks: {} as StopRanks,
  listOrders: {} as ListOrders,
  callLog: {} as CallLog,
  /** Parcels whose customer the driver noted as unreachable after calling, and when. */
  unreachable: {} as Record<string, string>,
  /** Alerts the driver deleted or cleared. The server has no delete, so they're hidden here. */
  hiddenNotifications: [] as string[],
  /** Alerts the driver marked unread again. The server has no "unread", so it's kept here. */
  unreadNotifications: [] as string[],
  /** Where the driver stood when they recorded a failed delivery. The server has no field for it. */
  failureLocations: {} as FailureLocations,
  /**
   * The agency's phone and email, as last found in the driver's data — kept
   * so the login screen, before anyone signs in, can still offer them.
   */
  dispatchContact: null as { phone?: string; email?: string; agencyName?: string } | null,
  /** Parcels the driver opened from Search, newest first. */
  recentSearches: [] as RecentSearch[],
};

/** A parcel opened from Search: enough to list it and find it again. */
export interface RecentSearch {
  trackingNumber: string;
  name?: string;
  /** When it was opened, ISO. */
  at: string;
}

/** Per parcel: the GPS fix taken when its failure was recorded, and when. */
type FailureLocations = Record<string, { lat: number; lng: number; at: string }>;

let hydration: Promise<void> | null = null;

function parse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    // A value that no longer parses (an interrupted write, an old format)
    // is treated as absent rather than taking the app down with it.
    return fallback;
  }
}

/** Loads everything once; every later call gets the same promise. */
export function hydrateDeviceStore(): Promise<void> {
  if (!hydration) {
    hydration = AsyncStorage.multiGet(Object.values(KEYS))
      .then((entries) => {
        const values = Object.fromEntries(entries);
        state.nearestFirst = parse(values[KEYS.nearestFirst], true);
        state.stopRanks = parse(values[KEYS.stopRanks], {});
        state.listOrders = parse(values[KEYS.listOrders], {});
        state.hiddenNotifications = parse(values[KEYS.hiddenNotifications], []);
        state.unreadNotifications = parse(values[KEYS.unreadNotifications], []);
        state.dispatchContact = parse(values[KEYS.dispatchContact], null);
        state.recentSearches = parse(values[KEYS.recentSearches], []);
        const failureCutoff = Date.now() - CALL_LOG_RETENTION_MS;
        state.failureLocations = Object.fromEntries(
          Object.entries(parse<FailureLocations>(values[KEYS.failureLocations], {})).filter(
            ([, fix]) => Date.parse(fix.at) >= failureCutoff
          )
        );

        state.unreachable = Object.fromEntries(
          Object.entries(parse<Record<string, string>>(values[KEYS.unreachable], {})).filter(
            ([, at]) => Date.parse(at) >= failureCutoff
          )
        );

        const cutoff = Date.now() - CALL_LOG_RETENTION_MS;
        const log = parse<CallLog>(values[KEYS.callLog], {});
        state.callLog = Object.fromEntries(
          Object.entries(log)
            .map(([id, times]) => [id, times.filter((time) => Date.parse(time) >= cutoff)] as const)
            .filter(([, times]) => times.length > 0)
        );
      })
      // Storage unavailable (a private browser window, a full disk): run on
      // defaults for this session rather than refusing to start.
      .catch(() => undefined);
  }
  return hydration;
}

async function persist(key: keyof typeof KEYS, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS[key], JSON.stringify(value));
  } catch {
    // Still correct for this session, just not remembered past it.
  }
}

// ── Stop order ─────────────────────────────────────────────────────────────

export function isNearestFirst(): boolean {
  return state.nearestFirst;
}

export async function setNearestFirst(enabled: boolean): Promise<void> {
  state.nearestFirst = enabled;
  await persist('nearestFirst', enabled);
}

/**
 * Saves the order the driver dragged the stops into. Dragging is a deliberate
 * override, so it also turns nearest-first off — otherwise the saved order
 * would never be the one shown. Runs that aren't in the list any more (all
 * delivered, taken off the driver) drop out here.
 */
export async function saveStopOrder(
  orderedIds: string[],
  runsheetOf: (stopId: string) => string | undefined
): Promise<void> {
  const ranks: StopRanks = {};
  orderedIds.forEach((stopId, rank) => {
    const runsheetId = runsheetOf(stopId);
    if (!runsheetId) return;
    (ranks[runsheetId] ??= {})[stopId] = rank;
  });
  state.stopRanks = ranks;
  state.nearestFirst = false;
  await Promise.all([persist('stopRanks', ranks), persist('nearestFirst', false)]);
}

/**
 * Puts stops back in the driver's saved order. Stops with a saved place come
 * first, in that order; anything dispatch added since keeps its incoming
 * order and follows, instead of vanishing or forcing a full re-drag.
 */
export function applyStopOrder<T extends { id: string }>(
  items: T[],
  runsheetOf: (stopId: string) => string | undefined
): T[] {
  const rankOf = (item: T) => {
    const runsheetId = runsheetOf(item.id);
    return runsheetId ? state.stopRanks[runsheetId]?.[item.id] : undefined;
  };
  const ranked = items
    .filter((item) => rankOf(item) !== undefined)
    .sort((a, b) => rankOf(a)! - rankOf(b)!);
  const rest = items.filter((item) => rankOf(item) === undefined);
  return [...ranked, ...rest];
}

// ── Pickups / Transfers / Returns order ───────────────────────────────────

export async function saveListOrder(list: OrderedList, orderedIds: string[]): Promise<void> {
  state.listOrders = { ...state.listOrders, [list]: orderedIds };
  await persist('listOrders', state.listOrders);
}

/** Same rule as stops: saved items first in the saved order, new ones after. */
export function applyListOrder<T extends { id: string }>(list: OrderedList, items: T[]): T[] {
  const order = state.listOrders[list] ?? [];
  const byId = new Map(items.map((item) => [item.id, item] as const));
  const kept = order.map((id) => byId.get(id)).filter((item): item is T => !!item);
  const keptIds = new Set(kept.map((item) => item.id));
  return [...kept, ...items.filter((item) => !keptIds.has(item.id))];
}

// ── Call log ──────────────────────────────────────────────────────────────

/** Every call placed for this parcel, oldest first. */
export function callsFor(parcelId: string): readonly string[] {
  return state.callLog[parcelId] ?? [];
}

/**
 * Whether the driver has pressed Call for this parcel at least once — the
 * gate on marking it delivered. Derived from the log rather than kept as a
 * separate flag, so the two can never disagree.
 */
export function hasCalled(parcelId: string): boolean {
  return callsFor(parcelId).length > 0;
}

/** Logs a call now and returns the parcel's full log. */
export async function recordCall(parcelId: string): Promise<readonly string[]> {
  const times = [...callsFor(parcelId), new Date().toISOString()];
  state.callLog = { ...state.callLog, [parcelId]: times };
  await persist('callLog', state.callLog);
  return times;
}

/** The driver called, and noted that the customer couldn't be reached. */
export function isUnreachable(parcelId: string): boolean {
  return parcelId in state.unreachable;
}

/** Notes "client injoignable" for this parcel. Only after a call: it never stands in for one. */
export async function markUnreachable(parcelId: string): Promise<boolean> {
  if (!hasCalled(parcelId)) return false;
  state.unreachable = { ...state.unreachable, [parcelId]: new Date().toISOString() };
  await persist('unreachable', state.unreachable);
  return true;
}

// ── Notifications: what the server can't store ────────────────────────────
// The server can mark an alert read, but it can't delete one or mark it
// unread again. Those two live here and are laid over the server's list on
// every fetch, so they stay applied after a refresh or a restart.

/** How many hidden / unread ids to remember — old alerts roll off the server anyway. */
const NOTIFICATION_MEMORY = 500;

export function isNotificationHidden(id: string): boolean {
  return state.hiddenNotifications.includes(id);
}

export async function hideNotifications(ids: string[]): Promise<void> {
  const next = [...new Set([...state.hiddenNotifications, ...ids])].slice(-NOTIFICATION_MEMORY);
  state.hiddenNotifications = next;
  state.unreadNotifications = state.unreadNotifications.filter((id) => !ids.includes(id));
  await Promise.all([
    persist('hiddenNotifications', next),
    persist('unreadNotifications', state.unreadNotifications),
  ]);
}

export function isMarkedUnread(id: string): boolean {
  return state.unreadNotifications.includes(id);
}

export async function setMarkedUnread(id: string, unread: boolean): Promise<void> {
  const others = state.unreadNotifications.filter((existing) => existing !== id);
  state.unreadNotifications = (unread ? [...others, id] : others).slice(-NOTIFICATION_MEMORY);
  await persist('unreadNotifications', state.unreadNotifications);
}

/** Read-all clears every local "unread" mark too. */
export async function clearMarkedUnread(): Promise<void> {
  state.unreadNotifications = [];
  await persist('unreadNotifications', []);
}

// ── Where a failure was recorded ──────────────────────────────────────────
// Proof the driver was at the address when they logged a failed delivery.
// The server's status update has no place for it, so it stays on the phone
// (kept 30 days, like the call log).

export function failureLocationFor(parcelId: string): { lat: number; lng: number } | undefined {
  const fix = state.failureLocations[parcelId];
  return fix ? { lat: fix.lat, lng: fix.lng } : undefined;
}

export async function saveFailureLocation(parcelId: string, fix: { lat: number; lng: number }): Promise<void> {
  state.failureLocations = {
    ...state.failureLocations,
    [parcelId]: { lat: fix.lat, lng: fix.lng, at: new Date().toISOString() },
  };
  await persist('failureLocations', state.failureLocations);
}

// ── The agency's contact ──────────────────────────────────────────────────

export function storedDispatchContact(): { phone?: string; email?: string; agencyName?: string } | null {
  return state.dispatchContact;
}

export async function saveDispatchContact(contact: { phone?: string; email?: string; agencyName?: string }): Promise<void> {
  state.dispatchContact = contact;
  await persist('dispatchContact', contact);
}

// ── Recent searches ───────────────────────────────────────────────────────
// Parcels the driver opened from Search, so coming back to Search shows
// them again. Kept on the phone, newest first; cleared on sign-out, since
// they name customers.

const MAX_RECENT_SEARCHES = 10;

export function recentSearches(): readonly RecentSearch[] {
  return state.recentSearches;
}

/** Puts a parcel at the top of the list (once — opening it again just moves it up). */
export async function addRecentSearch(entry: { trackingNumber: string; name?: string }): Promise<void> {
  const others = state.recentSearches.filter((item) => item.trackingNumber !== entry.trackingNumber);
  state.recentSearches = [{ ...entry, at: new Date().toISOString() }, ...others].slice(0, MAX_RECENT_SEARCHES);
  await persist('recentSearches', state.recentSearches);
}

export async function removeRecentSearch(trackingNumber: string): Promise<void> {
  state.recentSearches = state.recentSearches.filter((item) => item.trackingNumber !== trackingNumber);
  await persist('recentSearches', state.recentSearches);
}

export async function clearRecentSearches(): Promise<void> {
  state.recentSearches = [];
  await persist('recentSearches', []);
}
