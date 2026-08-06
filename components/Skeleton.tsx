import { useEffect } from 'react';
import { StyleSheet, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useColors } from '../constants';

interface SkeletonBlockProps {
  /**
   * Explicit width. Omit it (the common case) to let the block fill its
   * parent naturally via flex — e.g. `alignItems: 'stretch'` in a column, or
   * `flex: 1` passed through `style` in a row. Hard-coding `'100%'` here
   * would fight a sibling's `flex: 1` in a row layout (each block trying to
   * claim the full row width) rather than sharing it.
   */
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/** A single shimmering placeholder block — the loading-state building block for every screen's skeleton. */
export function SkeletonBlock({ width, height = 16, radius = 8, style }: SkeletonBlockProps) {
  const colors = useColors();
  const pulse = useSharedValue(0.4);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 650 }),
        withTiming(0.4, { duration: 650 })
      ),
      -1,
      true
    );
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: colors.separator },
        animatedStyle,
        style,
      ]}
    />
  );
}

/** A skeleton shaped like a list-detail row (small square + two text lines) — reused across every list screen. */
export function SkeletonRow({ style }: { style?: StyleProp<ViewStyle> }) {
  const colors = useColors();

  return (
    <Animated.View
      style={[styles.row, { backgroundColor: colors.bgElevated }, style]}>
      <SkeletonBlock width={30} height={30} radius={9} />
      <Animated.View style={styles.rowText}>
        <SkeletonBlock width="60%" height={14} radius={4} />
        <SkeletonBlock width="85%" height={12} radius={4} style={styles.rowSubline} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 22,
    padding: 16,
  },
  rowText: {
    flex: 1,
    gap: 6,
  },
  rowSubline: {
    marginTop: 2,
  },
});
