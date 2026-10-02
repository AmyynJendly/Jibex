import { useSyncExternalStore } from 'react';

import { checkedOf, subscribeChecklists } from './checklist';

/** The parcels checked so far for a pickup or a transfer; re-renders when the scanner (or a tick) changes it. */
export function useChecklist(key: string): ReadonlySet<string> {
  return useSyncExternalStore(
    subscribeChecklists,
    () => checkedOf(key),
    () => checkedOf(key)
  );
}
