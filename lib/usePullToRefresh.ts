import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

/** A refresh that hangs gives the spinner back after this long. */
const REFRESH_MAX_MS = 8_000;

/**
 * Pull to refresh for a list: the state and handler for a `RefreshControl`.
 *
 * It always ends — a reload that fails or hangs can't leave the spinner up —
 * and leaving the screen ends it too (iOS could otherwise bring the spinner
 * back stuck, the same problem Home works around).
 *
 * `refresh` must be a stable function — one of the `invalidate…` helpers
 * from `lib/query`.
 */
export function usePullToRefresh(refresh: () => unknown) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.race([
        Promise.resolve(refresh()).catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, REFRESH_MAX_MS)),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  useFocusEffect(useCallback(() => () => setRefreshing(false), []));

  return { refreshing, onRefresh };
}
