import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Exact path from the design's own checkmark icon (viewBox 15x12) — reused verbatim, not approximated. */
const CHECK_PATH = 'M1 6l4.5 4.5L14 1.5';
/** Length of CHECK_PATH, computed once (two line segments: ~6.36 + ~12.38), with headroom. */
const PATH_LENGTH = 19;

interface DrawnCheckmarkProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  /** @default 500 */
  duration?: number;
  /** Delay before the stroke starts drawing, so it can follow the badge's own entrance. @default 150 */
  delay?: number;
}

/** A checkmark that draws itself stroke-by-stroke (strokeDashoffset animating to 0) instead of appearing instantly. */
export function DrawnCheckmark({
  size = 30,
  color = '#fff',
  strokeWidth = 2.6,
  duration = 500,
  delay = 150,
}: DrawnCheckmarkProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, { duration, easing: Easing.out(Easing.cubic) })
    );
  }, [progress, duration, delay]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: PATH_LENGTH * (1 - progress.value),
  }));

  return (
    <Svg width={size} height={(size * 12) / 15} viewBox="0 0 15 12" fill="none">
      <AnimatedPath
        d={CHECK_PATH}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={PATH_LENGTH}
        animatedProps={animatedProps}
      />
    </Svg>
  );
}
