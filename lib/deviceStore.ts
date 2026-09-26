import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * State that belongs to this phone, not to the server.
 *
 * The backend has no endpoint for any of it — a driver's own stop order, the
 * calls they placed, whether they sort by nearest-first — so it lives here,
 * and it has to survive the app being closed: a driver who spent five
 * minutes arranging their route, or who called a customer before the app was
 * swiped away, can't lose that on the next launch. It stays on the phone
 * once the real API is wired in, too; that layer reads from here the same
 * way the mock does.
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
  hiddenNotifications: 'jibex.device.hiddenNotifications.v1',
  unreadNotifications: 'jibex.device.unreadNotifications.v1',
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
  /** Alerts the driver deleted or cleared. The server has no delete, so they're hidden here. */
  hiddenNotifications: [] as string[],
  /** Alerts the driver marked unread again. The server has no "unread", so it's kept here. */
  unreadNotifications: [] as string[],
};

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
