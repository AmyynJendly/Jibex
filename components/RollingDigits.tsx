import { useEffect } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

interface RollingDigitsProps {
  from: string;
  to: string;
  style?: StyleProp<TextStyle>;
  /** Per-column stagger, matching the design's roll-in sequence. */
  staggerMs?: number;
}

function DigitColumn({
  from,
  to,
  lineHeight,
  delay,
  style,
}: {
  from: string;
  to: string;
  lineHeight: number;
  delay: number;
  style?: StyleProp<TextStyle>;
}) {
  const progress = useSharedValue(0);
  const changed = from !== to;

  useEffect(() => {
    if (!changed) return;
    progress.set(withDelay(delay, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) })));
  }, [changed, delay, progress]);

  // Declared before the early return below, not after it. This used to sit
  // under the `from === to` branch, which meant the hook ran for changed
  // columns and not for unchanged ones — a different hook count depending on
  // the data, which React only tolerates until a digit changes mid-render.
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -progress.get() * lineHeight }],
  }));

  // Unchanged columns carry the same explicit line box as the rolling ones.
  // Without it they fell back to the font's own metrics while their rolling
  // neighbours were pinned to `lineHeight`, so a total that changed only its
  // last digit rendered with that digit visibly out of line with the rest.
  if (!changed) {
    return <Text style={[style, styles.cell, { height: lineHeight, lineHeight }]}>{to}</Text>;
  }

  return (
    <View style={{ height: lineHeight, overflow: 'hidden' }}>
      <Animated.View style={animatedStyle}>
        <Text style={[style, styles.cell, { height: lineHeight, lineHeight }]}>{from}</Text>
        <Text style={[style, styles.cell, { height: lineHeight, lineHeight }]}>{to}</Text>
      </Animated.View>
    </View>
  );
}

/**
 * Odometer-style digit roll — each character position that changes between
 * `from` and `to` slides vertically from its old digit to its new one;
 * unchanged characters (the decimal separator, currency suffix, digits
 * that didn't change) render as plain static text. Used for the "total in
 * bag" readout on Cash Collected, where the design shows this exact
 * mechanic. Requires `from`/`to` to be the same length — callers should
 * pad/format both through the same formatter first.
 */
export function RollingDigits({ from, to, style, staggerMs = 60 }: RollingDigitsProps) {
  // `style` may be a `StyleSheet.create()` reference (an opaque numeric ID
  // on native, not a plain object) — flatten before reading `fontSize`.
  const flatStyle = StyleSheet.flatten(style);
  const lineHeight = (flatStyle?.fontSize ?? 16) * 1.15;
  const fromChars = from.split('');
  const toChars = to.split('');
  const length = Math.max(fromChars.length, toChars.length);

  return (
    <View style={styles.row}>
      {Array.from({ length }).map((_, i) => (
        <DigitColumn
          key={i}
          from={fromChars[i] ?? toChars[i]}
          to={toChars[i] ?? fromChars[i]}
          lineHeight={lineHeight}
          delay={i * staggerMs}
          style={style}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  /** Centres each glyph inside the fixed line box the columns share. */
  cell: {
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
});
