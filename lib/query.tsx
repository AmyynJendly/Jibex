import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { driverPosition } from './driverPosition';
import {
  getActiveParcels,
  getClosedRunsheetsToday,
  getDriverStats,
  getHistoryParcels,
  getJobsByIds,
  getNearestFirst,
  getNotifications,
  getPickups,
  getReturns,
  getRunsheets,
  getTransfers,
  getUser,
  getVehicle,
  optimizeRouteOrder,
} from '../services/api';

/**
 * One cache, one refetch policy and one error state for every screen.
 * Switching tabs shows the cached data instead of refetching and showing
 * placeholders again, and a failed load can be retried.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A driver's parcels change when *they* change them, and every mutation
      // here invalidates explicitly. Half a minute is long enough that
      // bouncing between tabs is instant, short enough that a dispatch-side
      // change surfaces quickly.
      staleTime: 30_000,
      // Keep showing the last good data while a refetch runs, so returning to
      // a tab never flashes back to skeletons.
      placeholderData: (previous: unknown) => previous,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    },
  },
});

/**
 * Fresh data when the driver comes back to the app, not just to a tab.
 * Only what is on screen reloads; every other list is marked out of date
 * and reloads when its screen is opened — not a burst of requests for
 * screens nobody is looking at.
 */
function useRefetchOnForeground() {
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') queryClient.invalidateQueries({ refetchType: 'active' }, JOIN);
    });
    return () => sub.remove();
  }, []);
}

function ForegroundRefetch() {
  useRefetchOnForeground();
  return null;
}

export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ForegroundRefetch />
      {children}
    </QueryClientProvider>
  );
}

/**
 * How a PASSIVE refresh behaves — the 60 s timer, a screen getting focus,
 * pull-to-refresh, the app returning to the foreground: if the same list is
 * already being fetched, join that request instead of cancelling it and
 * starting another. The `invalidate…` helpers below, used after a write,
 * keep the default: they restart the fetch, so the screen can't be handed an
 * answer from before the write.
 */
const JOIN = { cancelRefetch: false } as const;

/** One place to name a cache entry, so invalidation can't drift from fetching. */
const keys = {
  user: ['user'] as const,
  vehicle: ['vehicle'] as const,
  stats: ['stats'] as const,
  runsheets: ['runsheets'] as const,
  closedRunsheetsToday: ['runsheets', 'closedToday'] as const,
  activeParcels: ['parcels', 'active'] as const,
  historyParcels: ['parcels', 'history'] as const,
  jobsByIds: (ids: string[]) => ['jobs', ids.join(',')] as const,
  routeOrder: (ids: string[]) => ['routeOrder', ids.join(',')] as const,
  nearestFirst: ['nearestFirst'] as const,
  driverPosition: ['driverPosition'] as const,
  notifications: ['notifications'] as const,
  pickups: ['pickups'] as const,
  transfers: ['transfers'] as const,
  returns: ['returns'] as const,
};

/** Forgets every cached answer — on sign-out, so the next driver starts clean. */
export function clearQueryCache() {
  queryClient.clear();
}

/**
 * Anything the driver just changed — parcel states, run confirmations, the
 * numbers derived from them. Called after a write so every screen holding
 * that data updates, not only the one that made the change.
 */
export function invalidateDeliveryData() {
  return queryClient.invalidateQueries({
    predicate: ({ queryKey }) =>
      ['parcels', 'jobs', 'runsheets', 'stats', 'notifications', 'routeOrder', 'nearestFirst', 'driverPosition'].includes(
        queryKey[0] as string
      ),
  });
}

/**
 * Reloads what is on screen right now, joining a request already on its way
 * instead of restarting it. Used after a write that timed out: the server may
 * have received it, so the screen must show what the server really has.
 */
export function refreshVisible() {
  return queryClient.invalidateQueries({ type: 'active' }, JOIN);
}

/** Reloads every list — after signing in again with a new token. */
export function refreshEverything() {
  return queryClient.invalidateQueries(undefined, JOIN);
}

export function invalidateNotifications() {
  return queryClient.invalidateQueries({ queryKey: keys.notifications });
}

// ── Passive refreshes: one request at a time per list ─────────────────────

const DELIVERY_KEYS = ['parcels', 'jobs', 'runsheets', 'stats', 'notifications', 'routeOrder', 'nearestFirst', 'driverPosition'];

/** The runs, their parcels and the numbers built from them. */
export function refreshDeliveryData() {
  return queryClient.invalidateQueries({ predicate: ({ queryKey }) => DELIVERY_KEYS.includes(queryKey[0] as string) }, JOIN);
}

export function refreshPickups() {
  return queryClient.invalidateQueries({ queryKey: keys.pickups }, JOIN);
}

export function refreshTransfers() {
  return queryClient.invalidateQueries({ queryKey: keys.transfers }, JOIN);
}

export function refreshReturns() {
  return queryClient.invalidateQueries({ queryKey: keys.returns }, JOIN);
}

export function invalidatePickups() {
  return queryClient.invalidateQueries({ queryKey: keys.pickups });
}

export function invalidateReturns() {
  return queryClient.invalidateQueries({ queryKey: keys.returns });
}

export function invalidateTransfers() {
  return queryClient.invalidateQueries({ queryKey: keys.transfers });
}

export const useUser = () => useQuery({ queryKey: keys.user, queryFn: getUser });
export const useVehicle = () => useQuery({ queryKey: keys.vehicle, queryFn: getVehicle });
export const useDriverStats = () => useQuery({ queryKey: keys.stats, queryFn: getDriverStats });
export const useRunsheets = () => useQuery({ queryKey: keys.runsheets, queryFn: getRunsheets });
/** Runs the agency closed today — what the Current tab shows once nothing is open. */
export const useClosedRunsheetsToday = () =>
  useQuery({ queryKey: keys.closedRunsheetsToday, queryFn: () => getClosedRunsheetsToday() });
export const useActiveParcels = () =>
  useQuery({ queryKey: keys.activeParcels, queryFn: getActiveParcels });
export const useHistoryParcels = () =>
  useQuery({ queryKey: keys.historyParcels, queryFn: getHistoryParcels });
export const useNotifications = () =>
  useQuery({ queryKey: keys.notifications, queryFn: getNotifications });
export const usePickups = () => useQuery({ queryKey: keys.pickups, queryFn: getPickups });
export const useTransfers = () => useQuery({ queryKey: keys.transfers, queryFn: getTransfers });
export const useReturns = () => useQuery({ queryKey: keys.returns, queryFn: getReturns });

/**
 * The driver's position as "Nearest first" sees it — the same lookup the
 * list was sorted with — so the screen can say why it fell back to
 * dispatch's order. Only asked for while "Nearest first" is on.
 */
export const useDriverPosition = (enabled: boolean) =>
  useQuery({ queryKey: keys.driverPosition, queryFn: driverPosition, enabled, staleTime: 60_000 });

export const useNearestFirst = () =>
  useQuery({ queryKey: keys.nearestFirst, queryFn: getNearestFirst });

export const useRouteOrder = (ids: string[]) =>
  useQuery({
    queryKey: keys.routeOrder(ids),
    queryFn: () => optimizeRouteOrder(ids),
    enabled: ids.length > 0,
  });

export const useJobsByIds = (ids: string[]) =>
  useQuery({
    queryKey: keys.jobsByIds(ids),
    queryFn: () => getJobsByIds(ids),
    enabled: ids.length > 0,
  });

/**
 * Collapses several queries into the one answer a screen actually needs:
 * is anything still arriving for the first time, did anything fail, and how
 * do I try again. Keeps every screen's loading/error branch identical.
 */
export function useScreenState(
  queries: { isPending: boolean; isError: boolean; refetch: () => unknown }[]
) {
  const [retrying, setRetrying] = useState(false);

  return {
    isPending: queries.some((q) => q.isPending),
    isError: queries.some((q) => q.isError),
    retrying,
    retry: async () => {
      setRetrying(true);
      await Promise.all(queries.map((q) => q.refetch()));
      setRetrying(false);
    },
  };
}
