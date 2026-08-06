import { useEffect, useState } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

interface CountUpTextProps {
  value: number;
  /** @default 350 */
  duration?: number;
  /** @default Math.round(n).toString() */
  formatter?: (n: number) => string;
  style?: StyleProp<TextStyle>;
}

/**
 * A `Text` whose displayed number animates toward `value` instead of
 * snapping — counts up from 0 on first mount, and smoothly re-counts from
 * whatever it currently shows if `value` changes later (e.g. after a
 * refetch), rather than resetting to 0 and replaying every time.
 */
export function CountUpText({ value, duration = 350, formatter, style }: CountUpTextProps) {
  const progress = useSharedValue(0);
  const [display, setDisplay] = useState(0);
  const format = formatter ?? ((n: number) => String(Math.round(n)));

  useEffect(() => {
    progress.value = withTiming(value, { duration, easing: Easing.out(Easing.cubic) });
  }, [value, duration, progress]);

  useAnimatedReaction(
    () => progress.value,
    (current) => {
      runOnJS(setDisplay)(current);
    }
  );

  return <Text style={style}>{format(display)}</Text>;
}
