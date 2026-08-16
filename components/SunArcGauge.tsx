import { useEffect } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { monoLabelStyle, monoStyle, useColors } from '../constants';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const BASE_WIDTH = 270;
const BASE_HEIGHT = 150;
const BASE_CENTER_X = 135;
const BASE_CENTER_Y = 132;
const BASE_RADIUS = 110;
const BASE_STROKE = 14;

interface SunArcGaugeProps {
  /** 0–100. */
  percent: number;
  /** e.g. "24 / 34 STOPS". */
  caption: string;
  style?: StyleProp<ViewStyle>;
  /** Uniformly scales every dimension (arc size, stroke, dot, text) — 1 = full size. */
  scale?: number;
}

/**
 * Semicircular "sun arc" delivery-progress gauge — the Home screen's
 * signature piece from the Sunlit design, replacing the previous flat
 * linear progress bar. The arc sweeps left→right through the top, with a
 * small glowing dot riding its leading edge (same trig the design's own
 * static mockup implies, generalized here to any `percent` instead of a
 * hardcoded 70%).
 */
export function SunArcGauge({ percent, caption, style, scale = 1 }: SunArcGaugeProps) {
  const colors = useColors();
  const clamped = Math.max(0, Math.min(100, percent));
  const progress = useSharedValue(0);

  const width = BASE_WIDTH * scale;
  const height = BASE_HEIGHT * scale;
  const centerX = BASE_CENTER_X * scale;
  const centerY = BASE_CENTER_Y * scale;
  const radius = BASE_RADIUS * scale;
  const stroke = BASE_STROKE * scale;
  const arcLength = Math.PI * radius;
  const trackPath = `M${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}`;

  useEffect(() => {
    progress.value = withTiming(clamped / 100, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [clamped, progress]);

  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: arcLength * (1 - progress.value),
  }));

  const dotCenter = useDerivedValue(() => {
    const theta = Math.PI * (1 - progress.value);
    return {
      cx: centerX + radius * Math.cos(theta),
      cy: centerY - radius * Math.sin(theta),
    };
  });
  const dotProps = useAnimatedProps(() => ({ cx: dotCenter.value.cx, cy: dotCenter.value.cy }));
  const dotHaloProps = useAnimatedProps(() => ({ cx: dotCenter.value.cx, cy: dotCenter.value.cy }));

  return (
    <View style={[styles.wrap, style]}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="sunArcGrad" x1="0" y1="1" x2="1" y2="0">
            <Stop offset={0} stopColor={colors.accent} />
            <Stop offset={0.6} stopColor={colors.warning} />
            <Stop offset={1} stopColor={colors.warning} />
          </LinearGradient>
        </Defs>
        <Path d={trackPath} stroke={colors.separator} strokeWidth={stroke} fill="none" strokeLinecap="round" />
        <AnimatedPath
          d={trackPath}
          stroke="url(#sunArcGrad)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={arcLength}
          animatedProps={arcProps}
        />
        <AnimatedCircle r={17 * scale} fill={colors.warning} opacity={0.28} animatedProps={dotHaloProps} />
        <AnimatedCircle
          r={10 * scale}
          fill={colors.warning}
          stroke={colors.bgElevated}
          strokeWidth={2.5 * scale}
          animatedProps={dotProps}
        />
      </Svg>
      <View style={styles.textStack} pointerEvents="none">
        <Text style={[monoStyle(40 * scale, 'medium'), { color: colors.text }]}>
          {Math.round(clamped)}%
        </Text>
        <Text style={[monoLabelStyle(11 * scale, 0.18), { color: colors.textTertiary }]}>{caption}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textStack: {
    position: 'absolute',
    bottom: 6,
    alignItems: 'center',
  },
});
