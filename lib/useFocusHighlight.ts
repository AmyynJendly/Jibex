import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

/** How long the arrived-at item stays marked before settling into the list. */
const HIGHLIGHT_MS = 3500;

/**
 * Reads the `focus` route param and reports which item the screen was opened
 * to show.
 *
 * A notification that says "Order #TRK-B6F31C08 refused" should not just drop
 * the driver on the runsheets tab to go find it — it should land on the
 * parcel. Scrolling alone isn't enough when ten cards look alike, so the
 * arrival is marked: the target card is outlined for a few seconds and then
 * fades back into the list.
 *
 * Temporary on purpose. A permanent marker would still be sitting there on
 * the next visit with no explanation of why that row is special.
 */
export function useFocusHighlight() {
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  // Which focus has had its few seconds. The highlight itself is derived from
  // that rather than copied into state, so a new link shows on the render it
  // arrives in instead of one render late.
  const [expired, setExpired] = useState<string | null>(null);

  useEffect(() => {
    if (!focus) return;
    const timer = setTimeout(() => setExpired(focus), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [focus]);

  return focus && focus !== expired ? focus : null;
}

function useTabParam<T extends string>(allowed: readonly T[]): T | null {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  return allowed.includes(tab as T) ? (tab as T) : null;
}

/**
 * A screen's segment (current/history, scheduled/completed), opened on the
 * side a link asked for through the `tab` route param.
 *
 * Seeding `useState` from the param alone isn't enough: a tab route like
 * Runsheets is mounted once and kept alive, so its initialiser runs exactly
 * one time — the first link would work and every later one would land on
 * whichever side the driver last chose. So a *changed* param moves the
 * segment again, adjusted during render (React's pattern for resetting state
 * when an input changes) rather than from an effect, which would paint the
 * old side for a frame first.
 */
export function useTabSegment<T extends string>(allowed: readonly T[], fallback: T) {
  const tabParam = useTabParam(allowed);
  const [segment, setSegment] = useState<T>(tabParam ?? fallback);
  const [seenParam, setSeenParam] = useState(tabParam);

  if (tabParam !== seenParam) {
    setSeenParam(tabParam);
    if (tabParam) setSegment(tabParam);
  }

  return [segment, setSegment] as const;
}
