import { useEffect } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

interface AmbientGlowProps {
  width: number;
  height: number;
  /** Glow tint — defaults to the design's warm gold halo. */
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * A soft radial glow that breathes slowly behind quiet moments (the login
 * logo, empty states, success badges) — gives otherwise static space a
 * sense of depth and life without competing for attention.
 *
 * Built with a plain `react-native-svg` radial gradient rather than a
 * blurred Skia canvas (the previous approach) — the Skia `Canvas` rendered
 * as a hard-edged opaque square on-device instead of a soft falloff, and
 * was never fully reliable across web/native. An SVG gradient has no
 * surface to composite wrong — it's just a shape with a soft edge by
 * construction — so this sidesteps the whole class of bug.
 */
export function AmbientGlow({ width, height, color = '#EAB464', style }: AmbientGlowProps) {
  const breathe = useSharedValue(0);

  useEffect(() => {
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, [breathe]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + breathe.value * 0.25,
    transform: [{ scale: 1 + breathe.value * 0.14 }],
  }));

  const r = Math.min(width, height) / 2;
  const gradientId = `glow-${color.replace('#', '')}`;

  return (
    <Animated.View pointerEvents="none" style={[{ width, height }, pulseStyle, style]}>
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id={gradientId} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#FFFCF8" stopOpacity={0.9} />
            <Stop offset="45%" stopColor={color} stopOpacity={0.32} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={width / 2} cy={height / 2} r={r} fill={`url(#${gradientId})`} />
      </Svg>
    </Animated.View>
  );
}
