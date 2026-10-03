import { router } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useToast } from './Toast';
import { onSessionExpired } from '../lib/session';

/**
 * Asks the driver to sign in again when the server stops accepting their
 * token. Tokens last 24 hours and can't be refreshed, so this is the normal
 * way a long-open app signs out.
 *
 * The login screen is opened ON TOP of the current screen, not in its place:
 * the screen underneath stays alive with whatever the driver had typed or
 * ticked, and signing in again brings him straight back to it (see
 * `lib/resume`). The cached lists are kept too, and reload once he is back.
 */
export function SessionExpiryWatcher() {
  const { t } = useTranslation();
  const { showToast } = useToast();

  useEffect(
    () =>
      onSessionExpired(() => {
        router.push({ pathname: '/(auth)/login', params: { resume: '1' } });
        showToast(t('auth.sessionExpired'));
      }),
    [showToast, t]
  );

  return null;
}
