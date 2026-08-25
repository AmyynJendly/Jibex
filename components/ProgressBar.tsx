import { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useColors } from '../constants';

interface ProgressBarProps {
  /** 0–100. */
  percent: number;
  color?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

/** A simple animated linear progress track — runsheet completion, anywhere else a percent needs a bar instead of an arc. */
export function ProgressBar({ percent, color, height = 6, style }: ProgressBarProps) {
  const colors = useColors();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(Math.max(0, Math.min(100, percent)), { duration: 500 });
  }, [percent, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  return (
    <View
      style={[
        { height, borderRadius: height / 2, backgroundColor: colors.separator, overflow: 'hidden' },
        style,
      ]}>
      <Animated.View
        style={[
          { height: '100%', borderRadius: height / 2, backgroundColor: color ?? colors.accent },
          fillStyle,
        ]}
      />
    </View>
  );
}
