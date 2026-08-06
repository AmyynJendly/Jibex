import { forwardRef, type ComponentRef } from 'react';
import { Pressable, type PressableProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type BaseAnimationBuilder,
  type EntryExitAnimationFunction,
  type LayoutAnimationFunction,
} from 'react-native-reanimated';

const ReanimatedPressable = Animated.createAnimatedComponent(Pressable);

type EntryOrExitLayoutType =
  | BaseAnimationBuilder
  | typeof BaseAnimationBuilder
  | EntryExitAnimationFunction;

interface AnimatedPressableProps extends PressableProps {
  /** Scale at full press-down. @default 0.96 */
  scaleTo?: number;
  /** Reanimated entrance animation — e.g. `FadeInUp.delay(i * 40)` for staggered lists. */
  entering?: EntryOrExitLayoutType;
  exiting?: EntryOrExitLayoutType;
  layout?: BaseAnimationBuilder | LayoutAnimationFunction | typeof BaseAnimationBuilder;
}

/**
 * Drop-in `Pressable` with iOS-native press feedback (spring scale-down +
 * slight opacity dim on press-in, spring back on release) — also supports
 * reanimated's `entering`/`exiting`/`layout` props since it's built on
 * `Animated.createAnimatedComponent`, so the same instance can carry a
 * list-entrance animation.
 */
export const AnimatedPressable = forwardRef<ComponentRef<typeof Pressable>, AnimatedPressableProps>(
  ({ scaleTo = 0.96, style, onPressIn, onPressOut, ...props }, ref) => {
    const pressed = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: 1 - pressed.value * (1 - scaleTo) }],
      opacity: 1 - pressed.value * 0.12,
    }));

    return (
      <ReanimatedPressable
        ref={ref}
        onPressIn={(e) => {
          pressed.value = withSpring(1, { duration: 150, dampingRatio: 1 });
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          pressed.value = withSpring(0, { duration: 200, dampingRatio: 1 });
          onPressOut?.(e);
        }}
        style={[animatedStyle, style]}
        {...props}
      />
    );
  }
);

AnimatedPressable.displayName = 'AnimatedPressable';
