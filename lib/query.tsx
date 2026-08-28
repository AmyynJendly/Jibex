import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import {
  getActiveParcels,
  getDriverStats,
  getHistoryParcels,
  getJobsByIds,
  getNotifications,
  getPickups,
  getReturns,
  getRunsheets,
  getTransfers,
  getUser,
  getVehicle,
  optimizeRouteOrder,
} from '../services/mock-api';

/**
 * Screens used to call the API directly from a `useFocusEffect`, which meant
 * every tab switch refetched everything and showed placeholders again — and a
 * failure left the screen on those placeholders forever, with nothing to
 * retry. This gives all of them one cache, one refetch policy, and a real
 * error state.
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

/** Fresh data when the driver comes back to the app, not just to a tab. */
function useRefetchOnForeground() {
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') queryClient.invalidateQueries();
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

/** One place to name a cache entry, so invalidation can't drift from fetching. */
export const keys = {
  user: ['user'] as const,
  vehicle: ['vehicle'] as const,
  stats: ['stats'] as const,
  runsheets: ['runsheets'] as const,
  activeParcels: ['parcels', 'active'] as const,
  historyParcels: ['parcels', 'history'] as const,
  jobsByIds: (ids: string[]) => ['jobs', ids.join(',')] as const,
  routeOrder: (ids: string[]) => ['routeOrder', ids.join(',')] as const,
  notifications: ['notifications'] as const,
  pickups: ['pickups'] as const,
  transfers: ['transfers'] as const,
  returns: ['returns'] as const,
};

/**
 * Anything the driver just changed — parcel states, run confirmations, the
 * numbers derived from them. Called after a mutation so every screen holding
 * that data updates, not only the one that made the change.
 */
export function invalidateDeliveryData() {
  return queryClient.invalidateQueries({
    predicate: ({ queryKey }) =>
      ['parcels', 'jobs', 'runsheets', 'stats', 'notifications'].includes(queryKey[0] as string),
  });
}

export function invalidateNotifications() {
  return queryClient.invalidateQueries({ queryKey: keys.notifications });
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
export const useActiveParcels = () =>
  useQuery({ queryKey: keys.activeParcels, queryFn: getActiveParcels });
export const useHistoryParcels = () =>
  useQuery({ queryKey: keys.historyParcels, queryFn: getHistoryParcels });
export const useNotifications = () =>
  useQuery({ queryKey: keys.notifications, queryFn: getNotifications });
export const usePickups = () => useQuery({ queryKey: keys.pickups, queryFn: getPickups });
export const useTransfers = () => useQuery({ queryKey: keys.transfers, queryFn: getTransfers });
export const useReturns = () => useQuery({ queryKey: keys.returns, queryFn: getReturns });

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
