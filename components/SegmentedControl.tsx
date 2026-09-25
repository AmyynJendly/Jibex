import NativeSegmentedControl from '@expo/ui/community/segmented-control';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';

import { useColors } from '../constants';
import { useHapticsEnabled } from '../lib/haptics';

interface Segment<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
}

/**
 * How long the system's selection slide takes. The screen's content switches
 * once it has landed rather than while it's moving.
 */
const SLIDE_MS = 220;

/**
 * The switcher used for list filters (Current/History, Scheduled/Completed).
 *
 * The platform's own control — a SwiftUI segmented `Picker` on iOS, Material
 * segmented buttons on Android — so its sliding selection, sizing and
 * accessibility come from the system rather than being redrawn by hand.
 *
 * The selection moves the instant it's tapped, but `onChange` waits for the
 * slide to finish. Several screens build a different layout per segment (a
 * drag list for Current, a virtualized list for History), and each carries
 * its own copy of this control: switching straight away tore down the one
 * mid-slide and put up a new one already on the other side, so the slide
 * never played. Rebuilding a list in the same frame also made it stutter.
 */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const colors = useColors();
  const { enabled: hapticsEnabled } = useHapticsEnabled();
  const [shown, setShown] = useState(value);
  const [lastValue, setLastValue] = useState(value);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The screen can change the segment itself (a notification opening
  // History), so follow the prop whenever it moves.
  if (value !== lastValue) {
    setLastValue(value);
    setShown(value);
  }

  useEffect(
    () => () => {
      if (pending.current) clearTimeout(pending.current);
    },
    []
  );

  const selectedIndex = Math.max(
    0,
    segments.findIndex((segment) => segment.value === shown)
  );

  return (
    <NativeSegmentedControl
      values={segments.map((segment) => segment.label)}
      selectedIndex={selectedIndex}
      tintColor={colors.accent}
      style={styles.control}
      onChange={({ nativeEvent }) => {
        const next = segments[nativeEvent.selectedSegmentIndex];
        if (!next || next.value === shown) return;
        if (hapticsEnabled) Haptics.selectionAsync();
        setShown(next.value);
        if (pending.current) clearTimeout(pending.current);
        pending.current = setTimeout(() => {
          pending.current = null;
          // Tapped back before the slide landed: nothing to switch.
          if (next.value !== value) onChange(next.value);
        }, SLIDE_MS);
      }}
    />
  );
}

const styles = StyleSheet.create({
  control: {
    alignSelf: 'stretch',
  },
});
