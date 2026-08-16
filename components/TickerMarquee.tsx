import { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { monoLabelStyle, useColors } from '../constants';

interface TickerMarqueeProps {
  /** Short status snippets, joined with a middle-dot separator and looped. */
  items: string[];
  height?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Scrolling status ticker — purely decorative chrome from the Sunlit
 * design's Login screen ("HUB SOUSSE OUVERT · 14 TOURNÉES · CIEL DÉGAGÉ
 * 31°C"). There's no real hub-status or weather data behind it in the mock
 * backend, so `items` are static/translated strings, not live data — same
 * "stub the visual, don't invent the backend" treatment as other
 * not-yet-built features in this app.
 */
export function TickerMarquee({ items, height = 30, style }: TickerMarqueeProps) {
  const colors = useColors();
  const offset = useSharedValue(0);
  // One copy of the content's natural width — the loop distance. Measured
  // via onLayout rather than assumed, since text width varies by locale.
  const [blockWidth, setBlockWidth] = useState(0);

  useEffect(() => {
    if (!blockWidth) return;
    offset.value = 0;
    offset.value = withRepeat(
      withTiming(-blockWidth, { duration: 22000, easing: Easing.linear }),
      -1,
      false
    );
  }, [blockWidth, offset]);

  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    setBlockWidth(e.nativeEvent.layout.width);
  }, []);

  const content = (
    <View style={styles.row}>
      {items.map((item, i) => (
        <View key={i} style={styles.itemRow}>
          {i === 0 && <Text style={[monoLabelStyle(10), { color: colors.accent }]}>{'● '}</Text>}
          <Text style={[monoLabelStyle(10), { color: colors.textSecondary }]}>{item}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <View
      style={[
        styles.wrap,
        { height, borderColor: colors.separator, backgroundColor: colors.bg },
        style,
      ]}>
      <Animated.View style={[styles.track, trackStyle]}>
        <View onLayout={handleLayout}>{content}</View>
        {blockWidth > 0 && content}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    justifyContent: 'center',
  },
  track: {
    flexDirection: 'row',
  },
  row: {
    flexDirection: 'row',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 24,
  },
});
