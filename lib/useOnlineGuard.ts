import { useNetInfo } from '@react-native-community/netinfo';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useToast } from '../components/Toast';

/**
 * Refuses an action that would be lost offline, and says why.
 *
 * There is no queue that can hold work and send it later, so the honest
 * behaviour in a dead zone is to stop and explain rather than accept
 * something the app can't keep.
 *
 * Reads only — opening a screen, refreshing a list — are deliberately not
 * gated: showing whatever was last cached is better than a wall.
 */
export function useOnlineGuard() {
  const netInfo = useNetInfo();
  const { showToast } = useToast();
  const { t } = useTranslation();

  /** True if the action may proceed. Toasts and returns false when it may not. */
  return useCallback(() => {
    // `null` means NetInfo hasn't determined connectivity yet; only an
    // explicit `false` is a known-offline device, so a slow first read never
    // blocks a driver who is actually online.
    if (netInfo.isConnected === false) {
      showToast(t('common.offlineAction'));
      return false;
    }
    return true;
  }, [netInfo.isConnected, showToast, t]);
}
