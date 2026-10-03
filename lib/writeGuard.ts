import type { WriteResult } from '../types';

/**
 * The lock behind every action button.
 *
 * A React state only changes on the next render, so two taps in the same
 * instant both pass a `if (submitting) return` check and the write goes out
 * twice. This lock is a plain variable, taken before anything is awaited:
 * the second tap is refused on the spot and sends nothing.
 *
 * It stays taken until the action has fully settled — success, failure or
 * timeout — however many requests the action makes. Each request has its own
 * time limit (see `request()` in services/real-api), so the lock always
 * comes back.
 *
 * Kept free of React so the rule can be tested; the hook is `useWrite`.
 */
export interface WriteGuard {
  /** Takes the lock. False when a write is already running: send nothing. */
  begin: () => boolean;
  /** Gives the lock back. Safe to call twice. */
  end: () => void;
  readonly running: boolean;
  /** Runs one action under the lock. Null when one was already running. */
  run: <T>(action: () => Promise<T>) => Promise<T | null>;
}

export function createWriteGuard(onChange: (running: boolean) => void = () => {}): WriteGuard {
  let running = false;
  const set = (next: boolean) => {
    if (running === next) return;
    running = next;
    onChange(next);
  };
  return {
    begin() {
      if (running) return false;
      set(true);
      return true;
    },
    end() {
      set(false);
    },
    get running() {
      return running;
    },
    async run(action) {
      if (running) return null;
      set(true);
      try {
        return await action();
      } finally {
        set(false);
      }
    },
  };
}

/** A failure worth offering "Réessayer" for: the request never got an answer. */
export function isRetryable(result: Pick<WriteResult, 'error'>): boolean {
  return result.error === 'common.networkError' || result.error === 'common.slowConnection';
}

/** The server may have received a request that timed out: the screen must reload to show the truth. */
export function mayHaveReachedServer(result: Pick<WriteResult, 'error'>): boolean {
  return result.error === 'common.slowConnection';
}
