import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Fonts, Spacing, Typography, useColors } from '../constants';
import { AmbientGlow } from './AmbientGlow';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}

/** A calm, considered empty state — icon gently floats instead of just sitting there. */
export function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  const colors = useColors();
  const float = useSharedValue(0);

  useEffect(() => {
    float.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, [float]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: float.value * -5 }],
  }));

  return (
    <Animated.View entering={FadeIn.duration(250)} style={styles.container}>
      <View style={styles.iconStage}>
        <View style={styles.glowLayer}>
          <AmbientGlow width={140} height={140} color={colors.warning} />
        </View>
        <Animated.View style={[styles.iconCircle, { backgroundColor: colors.separator }, floatStyle]}>
          <Ionicons name={icon} size={26} color={colors.textTertiary} />
        </Animated.View>
      </View>
      <Text style={[Typography.callout, styles.title, { color: colors.textSecondary }]}>
        {title}
      </Text>
      {subtitle && (
        <Text style={[Typography.footnote, styles.subtitle, { color: colors.textTertiary }]}>
          {subtitle}
        </Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: Spacing.huge,
    paddingBottom: Spacing.huge,
    gap: Spacing.md,
  },
  iconStage: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: -Spacing.xxl,
  },
  glowLayer: {
    position: 'absolute',
    width: 140,
    height: 140,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.archivoSemiBold,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginTop: -Spacing.xs,
  },
});
