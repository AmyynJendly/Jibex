import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useColors } from '../constants';

interface Mote {
  left: number;
  top: number;
  size: number;
  delay: number;
  duration: number;
  driftX: number;
  driftY: number;
}

const DEFAULT_MOTES: Mote[] = [
  { left: 26, top: 34, size: 5, delay: 0, duration: 9000, driftX: 26, driftY: -70 },
  { left: 120, top: 74, size: 4, delay: 1600, duration: 11000, driftX: 22, driftY: -64 },
  { left: 280, top: 56, size: 4, delay: 3200, duration: 10000, driftX: 18, driftY: -68 },
];

function MoteDot({ mote, color }: { mote: Mote; color: string }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      mote.delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: mote.duration, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 0 })
        ),
        -1,
        false
      )
    );
  }, [mote, progress]);

  const style = useAnimatedStyle(() => {
    const opacity = progress.value < 0.15 ? progress.value / 0.15 : (1 - progress.value) * 0.9;
    return {
      opacity,
      transform: [
        { translateX: progress.value * mote.driftX },
        { translateY: progress.value * mote.driftY },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          left: mote.left,
          top: mote.top,
          width: mote.size,
          height: mote.size,
          borderRadius: mote.size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

/**
 * A few soft, slow-drifting light specks — decorative chrome for the Home
 * screen's top gradient (the Sunlit design's `jsMote` keyframe). Purely
 * visual, no touch handling, sits behind foreground content.
 */
export function ParticleMotes({ style }: { style?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  return (
    <View style={[StyleSheet.absoluteFill, styles.wrap, style]} pointerEvents="none">
      {DEFAULT_MOTES.map((mote, i) => (
        <MoteDot key={i} mote={mote} color={colors.bgElevated} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
  },
  dot: {
    position: 'absolute',
  },
});
