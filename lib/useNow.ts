import { useEffect, useState } from 'react';

/**
 * The current time, re-read every `intervalMs`.
 *
 * Reading `Date.now()` straight in render gives a screen a clock that only
 * moves when something unrelated re-renders it — a "3m" label or an ETA
 * that sits frozen while the driver looks at it. This ticks on its own.
 */
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
