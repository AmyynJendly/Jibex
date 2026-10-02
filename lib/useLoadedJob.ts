import { useEffect, useState } from 'react';

import { getJobDetail } from '../services/api';
import type { Job } from '../types';

/**
 * One parcel, loaded for a screen — with a way out when it doesn't arrive.
 *
 * The stop screens used to call `getJobDetail(id).then(setJob)` and nothing
 * else: with no connection the promise rejected unhandled, and the screen sat
 * on "Loading…" forever. This reports the failure so the screen can show
 * "Connexion impossible" with a retry button.
 */
export function useLoadedJob(id: string) {
  const [job, setJob] = useState<Job | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getJobDetail(id)
      .then((loaded) => {
        if (cancelled) return;
        setJob(loaded);
        setFailed(false);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  return {
    job,
    setJob,
    /** The parcel couldn't be loaded (and there's nothing older to show). */
    failed: failed && !job,
    /** A retry is on its way. */
    retrying: !failed && !job && attempt > 0,
    retry: () => {
      setFailed(false);
      setAttempt((n) => n + 1);
    },
  };
}
