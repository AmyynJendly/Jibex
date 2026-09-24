import NativeSegmentedControl from '@expo/ui/community/segmented-control';
import * as Haptics from 'expo-haptics';
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
 * The switcher used for list filters (Current/History, Scheduled/Completed).
 *
 * The platform's own control — a SwiftUI segmented `Picker` on iOS, Material
 * segmented buttons on Android — so its sliding selection, sizing and
 * accessibility come from the system rather than being redrawn by hand.
 */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const colors = useColors();
  const { enabled: hapticsEnabled } = useHapticsEnabled();
  const selectedIndex = Math.max(
    0,
    segments.findIndex((segment) => segment.value === value)
  );

  return (
    <NativeSegmentedControl
      values={segments.map((segment) => segment.label)}
      selectedIndex={selectedIndex}
      tintColor={colors.accent}
      style={styles.control}
      onChange={({ nativeEvent }) => {
        const next = segments[nativeEvent.selectedSegmentIndex];
        if (!next || next.value === value) return;
        if (hapticsEnabled) Haptics.selectionAsync();
        onChange(next.value);
      }}
    />
  );
}

const styles = StyleSheet.create({
  control: {
    alignSelf: 'stretch',
  },
});
