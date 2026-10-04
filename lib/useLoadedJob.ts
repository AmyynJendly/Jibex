import { useEffect, useState } from 'react';

import { getJobDetail } from '../services/api';
import type { Job } from '../types';

/**
 * One parcel, loaded for a screen — with a way out when it doesn't arrive.
 *
 * With no connection the load fails; this reports the failure, so the
 * screen shows "Connexion impossible" with a retry button instead of
 * sitting on "Loading…" forever.
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
