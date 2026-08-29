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
  const [highlighted, setHighlighted] = useState<string | null>(focus ?? null);

  useEffect(() => {
    if (!focus) {
      setHighlighted(null);
      return;
    }
    setHighlighted(focus);
    const timer = setTimeout(() => setHighlighted(null), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [focus]);

  return highlighted;
}

/**
 * Reads the `tab` route param, or null when the screen wasn't opened to a
 * particular side.
 *
 * Screens hold their own segment state and apply this through an effect
 * rather than seeding `useState` with it. A tab route like Runsheets is
 * mounted once and kept alive, so its state initialiser runs exactly one
 * time — seeding from the param there means the very first visit works and
 * every later link silently lands on whichever side the driver last chose.
 */
export function useTabParam<T extends string>(allowed: readonly T[]): T | null {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  return allowed.includes(tab as T) ? (tab as T) : null;
}
