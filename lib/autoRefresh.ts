/**
 * Keeps a visible list fresh without the driver asking.
 *
 * The agency changes a driver's day from its side — a new runsheet, a parcel
 * added to a started run, a pickup assigned — and none of it is pushed to
 * the phone. In the live test a new runsheet only appeared after the driver
 * went to Home and pulled to refresh. So while a list is on screen it
 * reloads: once when it comes into view, then every minute.
 *
 * Nothing runs while the app is in the background (the tick is skipped, not
 * queued): coming back to the foreground already reloads everything, see
 * `lib/query`.
 *
 * Kept free of React and React Native so the timing can be tested; the hook
 * that wires it to a screen's focus is `useAutoRefresh`.
 */
export const AUTO_REFRESH_MS = 60_000;

export interface AutoRefresher {
  /** The list came into view: reload now, then on every interval. */
  start: () => void;
  /** The list left the screen: stop. */
  stop: () => void;
}

export function autoRefresher(
  refresh: () => unknown,
  { intervalMs = AUTO_REFRESH_MS, isAppActive = () => true }: { intervalMs?: number; isAppActive?: () => boolean } = {}
): AutoRefresher {
  let timer: ReturnType<typeof setInterval> | null = null;

  // A reload that fails must never surface as an uncaught error: the screen
  // already has its own error state and retry.
  const run = () => {
    try {
      Promise.resolve(refresh()).catch(() => {});
    } catch {
      // Same: the next tick tries again.
    }
  };

  return {
    start() {
      if (timer) return;
      run();
      timer = setInterval(() => {
        if (isAppActive()) run();
      }, intervalMs);
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
    },
  };
}
