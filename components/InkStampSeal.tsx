import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path, TextPath, Text as SvgText, Defs } from 'react-native-svg';

import { useColors } from '../constants';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const SIZE = 150;
const CENTER = 75;
const CHECK_PATH = 'M52 76l16 16 32-34';
/** Approximate on-screen length of `CHECK_PATH` — the checkmark's stroke-dasharray. */
const CHECK_LENGTH = 60;

interface InkStampSealProps {
  /** Curved text on the outer ring, e.g. "JIBEX · SOUSSE". */
  topText: string;
  /** Curved text on the inner ring, e.g. "14:26 · R-12". */
  bottomText: string;
}

/**
 * Delivery-confirmed "ink stamp" seal — two engraved rings with curved
 * text and a hand-drawn checkmark that draws itself in. Replaces the
 * previous plain ripple-ring animation on the Cash Collected screen.
 */
export function InkStampSeal({ topText, bottomText }: InkStampSealProps) {
  const colors = useColors();
  const stampIn = useSharedValue(0);
  const checkDraw = useSharedValue(0);

  useEffect(() => {
    stampIn.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.exp) });
    checkDraw.value = withDelay(500, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [stampIn, checkDraw]);

  const stampStyle = useAnimatedStyle(() => ({
    opacity: stampIn.value,
    transform: [
      { scale: 1.5 - stampIn.value * 0.5 },
      { rotate: `${-14 + stampIn.value * 7}deg` },
    ],
  }));

  const checkProps = useAnimatedProps(() => ({
    strokeDashoffset: CHECK_LENGTH * (1 - checkDraw.value),
  }));

  return (
    <View style={styles.ringStage}>
      <View style={[styles.ring, styles.ringOuter, { borderColor: colors.accent }]} />
      <View style={[styles.ring, styles.ringDashed, { borderColor: colors.accent }]} />
      <Animated.View style={stampStyle}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <Defs>
            <Path id="sealArcTop" d={`M${CENTER} ${CENTER} m -52 0 a 52 52 0 1 1 104 0`} fill="none" />
            <Path id="sealArcBottom" d={`M${CENTER} ${CENTER} m 52 0 a 52 52 0 1 1 -104 0`} fill="none" />
          </Defs>
          <Circle cx={CENTER} cy={CENTER} r={62} fill="none" stroke={colors.accent} strokeWidth={3} opacity={0.9} />
          <Circle cx={CENTER} cy={CENTER} r={54} fill="none" stroke={colors.accent} strokeWidth={1.5} opacity={0.7} />
          <SvgText fill={colors.accent} fontSize={11} letterSpacing={1.6}>
            <TextPath href="#sealArcTop" startOffset="50%" textAnchor="middle">
              {topText}
            </TextPath>
          </SvgText>
          <SvgText fill={colors.accent} fontSize={11} letterSpacing={3}>
            <TextPath href="#sealArcBottom" startOffset="50%" textAnchor="middle">
              {bottomText}
            </TextPath>
          </SvgText>
          <AnimatedPath
            d={CHECK_PATH}
            stroke={colors.accent}
            strokeWidth={7}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={CHECK_LENGTH}
            animatedProps={checkProps}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  ringStage: {
    width: 176,
    height: 176,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
  },
  ringOuter: {
    width: 150,
    height: 150,
    borderWidth: 1.5,
    opacity: 0.4,
  },
  ringDashed: {
    width: 176,
    height: 176,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    opacity: 0.3,
  },
});
