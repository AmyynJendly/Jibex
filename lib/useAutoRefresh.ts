import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { AppState } from 'react-native';

import { autoRefresher } from './autoRefresh';

/**
 * Reloads a screen's data when the screen gets focus, and every minute while
 * it stays in view (see `lib/autoRefresh`). `refresh` must be a stable
 * function — one of the `invalidate…` helpers from `lib/query`.
 *
 * `enabled` lets a screen with several lists refresh only for the one that
 * is showing (the Current tab, not History).
 */
export function useAutoRefresh(refresh: () => unknown, enabled = true) {
  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
      const refresher = autoRefresher(refresh, { isAppActive: () => AppState.currentState === 'active' });
      refresher.start();
      return refresher.stop;
    }, [refresh, enabled])
  );
}
