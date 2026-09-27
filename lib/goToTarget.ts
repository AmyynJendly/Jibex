import { router } from 'expo-router';

import type { NotificationTarget } from '../types';

/**
 * Opens the screen a target points to — a parcel's stop screen, or the list
 * (and tab) something lives in, with that item highlighted. Shared by Alerts
 * and Search, so both land a driver in the same place for the same thing.
 *
 * Every destination carries the tab to open on and, where it's about one
 * specific thing, that thing's id. Landing on the right list is not the
 * same as landing on the parcel — "Order #TRK-B6F31C08 refused" should put
 * the driver on that parcel in runsheet history, not on the runsheets tab
 * with ten cards to read through.
 *
 * `replace` swaps the current screen instead of stacking on top of it (Search
 * does this, so Back returns to wherever the search started).
 */
export function goToTarget(target: NotificationTarget, { replace = false } = {}) {
  const go = replace ? router.replace : router.push;
  switch (target.screen) {
    case 'job':
      go({ pathname: '/job/[id]', params: { id: target.jobId } });
      return;
    case 'pickups':
      go({ pathname: '/pickups', params: focusParams(target.tab, target.focusId) });
      return;
    case 'transfers':
      go({ pathname: '/transfers', params: focusParams(target.tab, target.focusId) });
      return;
    case 'returns':
      go({ pathname: '/returns', params: focusParams(target.tab, target.focusId) });
      return;
    case 'runsheets':
      go({ pathname: '/(tabs)/runsheets', params: focusParams(target.tab, target.focusId) });
      return;
  }
}

function focusParams(tab: string, focusId?: string) {
  return focusId ? { tab, focus: focusId } : { tab };
}
