import { Platform } from 'react-native';
import {
  Easing,
  FadeInDown,
  FadeInUp,
  FadeOutDown,
  FadeOutUp,
  Keyframe,
} from 'react-native-reanimated';

/**
 * Motion tokens.
 *
 * Every entrance in the app used to pick its own duration and damping inline,
 * so a toast, a dialog and a list row all arrived with slightly different
 * personalities. These are the shared curves, and the builders below are the
 * shared entrances — screens should reach for one of them rather than
 * hand-tuning `FadeInUp.duration(217)` at the call site.
 */

/** Easing curves. Never `ease-in` on UI — it delays the exact moment the user is watching. */
export const Ease = {
  /** Entrances and exits. Stronger than `Easing.out(Easing.ease)`. */
  out: Easing.bezier(0.23, 1, 0.32, 1),
  /** Something moving or morphing while already on screen. */
  inOut: Easing.bezier(0.77, 0, 0.175, 1),
  /** The iOS sheet curve. */
  sheet: Easing.bezier(0.32, 0.72, 0, 1),
} as const;

/**
 * Spring configs for gesture and press feedback, in Apple's two designer
 * parameters. These drive `withSpring` directly, so the layout-animation
 * caveat below does not apply to them.
 */
export const Spring = {
  /** Something snapping back to a resting position. */
  settle: { duration: 340, dampingRatio: 0.9 },
  /** Under the finger. Critically damped — an overshoot here reads as a slip. */
  press: { duration: 140, dampingRatio: 1 },
  /** Released. A little life on the way back is what makes it feel physical. */
  release: { duration: 260, dampingRatio: 0.7 },
} as const;

/**
 * Why the entrances below fall back to stock builders on web.
 *
 * Reanimated 4.1.7's web layout-animation code schedules a cleanup timer for
 * any animation that isn't one of its own built-ins, and that callback runs:
 *
 *     if (shouldSavePosition) setElementPosition(element, snapshots.get(element));
 *
 * If the element unmounts before the timer fires there is no snapshot, and the
 * unguarded read takes the whole page down with "Cannot read properties of
 * undefined (reading 'top')". The offline banner triggers it on most loads:
 * NetInfo reports a moment of "offline" before it resolves, so the banner
 * mounts and unmounts well inside the animation window.
 *
 * Native has no such path, and native is what ships — so iOS and Android get
 * the designed motion and web gets the nearest stock equivalent. Anything
 * built on `Keyframe` needs this guard; springs and `withTiming` do not.
 */
const useStockBuilders = Platform.OS === 'web';

/**
 * Grow-and-rise entrance: fades up while scaling from 94%, with a small
 * overshoot just past the target before it settles.
 *
 * Reanimated's stock builders do one axis each — `FadeInUp` translates,
 * `ZoomIn` scales — and combining them means nesting two `Animated.View`s.
 * The overshoot frame is what makes it read as "grew into place" rather than
 * "was switched on".
 *
 * A new instance per call on purpose: `.delay()` and `.duration()` mutate the
 * builder and return it, so a shared module-level instance would leak one
 * call site's delay into every other.
 */
export function morphIn(delay = 0, distance = 10) {
  if (useStockBuilders) {
    return (distance < 0 ? FadeInDown : FadeInUp).duration(380).delay(delay);
  }
  return new Keyframe({
    0: { opacity: 0, transform: [{ translateY: distance }, { scale: 0.94 }] },
    62: {
      opacity: 1,
      transform: [{ translateY: -distance * 0.12 }, { scale: 1.012 }],
      easing: Ease.out,
    },
    100: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] },
  })
    .duration(380)
    .delay(delay);
}

/** `morphIn` mirrored for things that live at the top of the screen and drop in. */
export function morphInDown(delay = 0, distance = 10) {
  return morphIn(delay, -distance);
}

/** Exits, quicker than the entrances — the user has already moved on. */
export function exitUp(duration = 170) {
  return FadeOutUp.duration(duration);
}

export function exitDown(duration = 170) {
  return FadeOutDown.duration(duration);
}
