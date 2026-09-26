import { router } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useToast } from './Toast';
import { clearQueryCache } from '../lib/query';
import { onSessionExpired } from '../lib/session';

/**
 * Sends the driver back to the login screen when the server stops accepting
 * their token. Tokens last 24 hours and can't be refreshed, so this is the
 * normal way a long-open app signs out. The session is already cleared by
 * the time this runs; this drops everything cached for that driver, says why,
 * and moves to login.
 */
export function SessionExpiryWatcher() {
  const { t } = useTranslation();
  const { showToast } = useToast();

  useEffect(
    () =>
      onSessionExpired(() => {
        clearQueryCache();
        router.replace('/(auth)/login');
        showToast(t('auth.sessionExpired'));
      }),
    [showToast, t]
  );

  return null;
}
