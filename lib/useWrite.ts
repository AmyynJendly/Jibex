import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useToast } from '../components/Toast';
import type { WriteResult } from '../types';
import { refreshVisible } from './query';
import { createWriteGuard, isRetryable, mayHaveReachedServer } from './writeGuard';
import { writeErrorText } from './writeResult';

/**
 * What every action button uses.
 *
 *  - `begin()` takes the lock before anything is sent; a second tap gets
 *    `false` and sends nothing (see `lib/writeGuard`).
 *  - `sending` drives the button: blocked, and labelled "Envoi…".
 *  - `end()` gives the lock back once the server has answered.
 *  - `fail(result, retry)` says why it didn't work. When the request never
 *    got an answer — no network, or a timeout — the message comes with a
 *    "Réessayer" button, so the action is never lost silently. After a
 *    timeout the lists reload too: the server may have received it.
 *
 * Nothing is ever shown as done before the server confirms: the screens
 * only move on from a successful result.
 */
export function useWrite() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [sending, setSending] = useState(false);
  const guard = useRef(createWriteGuard(setSending)).current;

  function fail(result: Pick<WriteResult, 'error' | 'errorParams'>, retry?: () => void) {
    if (mayHaveReachedServer(result)) refreshVisible().catch(() => {});
    const message = writeErrorText(t, result);
    if (retry && isRetryable(result)) showToast(message, { label: t('common.loadError.retry'), onPress: retry });
    else showToast(message);
  }

  return { sending, begin: guard.begin, end: guard.end, fail };
}
