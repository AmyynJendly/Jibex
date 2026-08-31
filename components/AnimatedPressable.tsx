import * as Haptics from 'expo-haptics';
import { forwardRef, useEffect, useRef, type ComponentRef } from 'react';
import { Pressable, type PressableProps } from 'react-native';
// Tried swapping this for gesture-handler's own Pressable, since it shares
// the gesture arena with Pan gestures (swipe-to-delete, drag) and should
// lose arbitration cleanly instead of still firing onPress. It broke plain
// taps wherever a Pressable sits inside another gesture-handler recognizer
// (e.g. every row in a Swipeable) — nested gesture-handler recognizers need
// explicit relations (simultaneousHandlers/blocksExternalGesture) to resolve
// correctly, and without that wiring the outer recognizer can just eat the
// tap. Not worth that coupling for one screen — see the swipe-guard ref in
// alerts/index.tsx for how that case is actually handled.
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type BaseAnimationBuilder,
  type EntryExitAnimationFunction,
  type LayoutAnimationFunction,
} from 'react-native-reanimated';

import { Spring } from '../constants';
import { useHapticsEnabled } from '../lib/haptics';

const ReanimatedPressable = Animated.createAnimatedComponent(Pressable);

const PRESS_RETENTION = { top: 12, bottom: 12, left: 12, right: 12 };

/**
 * How long a press has to hold before the haptic fires.
 *
 * `onPressIn` fires the instant a finger touches down — inside a scrolling
 * list that's also the instant a scroll gesture begins, since RN's touch
 * responder hasn't yet decided which gesture wins. Firing the haptic there
 * meant every card under a finger buzzed as the driver scrolled past it. A
 * genuine tap holds for well over this long before lifting; a scroll starts
 * moving inside it, which cancels the press (and this timer) before the
 * haptic ever fires.
 */
const HAPTIC_ARM_DELAY = 70;

/** No-op on platforms without a taptic engine; expo-haptics handles that. */
function fireHaptic(style: HapticStyle) {
  if (!style) return;
  if (style === 'selection') {
    Haptics.selectionAsync();
    return;
  }
  Haptics.impactAsync(
    style === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
  );
}

type EntryOrExitLayoutType =
  | BaseAnimationBuilder
  | typeof BaseAnimationBuilder
  | EntryExitAnimationFunction;

/** Intensity of the tap that fires under the finger. `false` for silence. */
type HapticStyle = 'selection' | 'light' | 'medium' | false;

interface AnimatedPressableProps extends PressableProps {
  /** Scale at full press-down. @default 0.96 */
  scaleTo?: number;
  /**
   * Tactile feedback on press-in. @default 'light'
   *
   * Defaults on because this component *is* the app's interactive wrapper —
   * anything wrapped in it is a deliberate control, and the app previously
   * had no touch feedback at all outside three terminal moments (scan
   * success, wrong OTP, shutter). That absence is most of what made it feel
   * inert next to apps the driver uses all day.
   *
   * Fires on press-in, not on the tap completing: press-in is the causal
   * moment, and a haptic that waits for the gesture to finish reads as lag.
   * Pass `false` where the screen already fires its own, so a single action
   * never buzzes twice.
   */
  haptic?: HapticStyle;
  /** Reanimated entrance animation — e.g. `FadeInUp.delay(i * 40)` for staggered lists. */
  entering?: EntryOrExitLayoutType;
  exiting?: EntryOrExitLayoutType;
  layout?: BaseAnimationBuilder | LayoutAnimationFunction | typeof BaseAnimationBuilder;
}

/**
 * Drop-in `Pressable` with iOS-native press feedback (spring scale-down +
 * a slight downward dip + opacity dim on press-in, spring back on release)
 * — also supports reanimated's `entering`/`exiting`/`layout` props since
 * it's built on `Animated.createAnimatedComponent`, so the same instance can
 * carry a list-entrance animation.
 *
 * Deliberately 2D-only (scale/translateY, no `perspective`/`rotateX`) — a 3D
 * transform here previously broke native `BlurView`/`GlassView` backdrop
 * sampling on iOS (rendered solid black) for every button built on
 * `GlassSurface`, which is most of them. Don't reintroduce a 3D matrix
 * transform on this component without confirming it's safe on a real
 * glass-surfaced button, not just a plain one.
 */
export const AnimatedPressable = forwardRef<ComponentRef<typeof Pressable>, AnimatedPressableProps>(
  ({ scaleTo = 0.96, haptic = 'light', style, onPressIn, onPressOut, ...props }, ref) => {
    const pressed = useSharedValue(0);
    const { enabled: hapticsEnabled } = useHapticsEnabled();
    const hapticTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    function clearHapticTimer() {
      if (hapticTimer.current) {
        clearTimeout(hapticTimer.current);
        hapticTimer.current = null;
      }
    }

    useEffect(() => clearHapticTimer, []);

    const animatedStyle = useAnimatedStyle(() => {
      const p = pressed.get();
      return {
        transform: [{ translateY: p * 1.5 }, { scale: 1 - p * (1 - scaleTo) }],
        opacity: 1 - p * 0.12,
      };
    });

    return (
      <ReanimatedPressable
        ref={ref}
        onPressIn={(e) => {
          // Critically damped going down: an overshoot under the finger
          // reads as the button slipping out from under it.
          pressed.set(withSpring(1, Spring.press));
          if (haptic && hapticsEnabled) {
            clearHapticTimer();
            hapticTimer.current = setTimeout(() => fireHaptic(haptic), HAPTIC_ARM_DELAY);
          }
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          // Coming back up it gets a little rebound, which is what makes
          // the button feel like an object rather than a state flag.
          pressed.set(withSpring(0, Spring.release));
          clearHapticTimer();
          onPressOut?.(e);
        }}
        // A finger that drifts a few points shouldn't cancel a press the
        // driver meant — they're often tapping one-handed in a moving van.
        pressRetentionOffset={PRESS_RETENTION}
        style={[animatedStyle, style]}
        {...props}
      />
    );
  }
);

AnimatedPressable.displayName = 'AnimatedPressable';
