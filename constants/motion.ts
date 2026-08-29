import { Easing, Keyframe } from 'react-native-reanimated';

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
 * parameters. These drive `withSpring` directly — the entrance builders below
 * can't use them (see the note on `morphIn`).
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
 * Grow-and-rise entrance: fades up while scaling from 94%, with a small
 * overshoot just past the target before it settles.
 *
 * Reanimated's stock builders do one axis each — `FadeInUp` translates,
 * `ZoomIn` scales — and combining them means nesting two `Animated.View`s.
 * The overshoot frame is what makes it read as "grew into place" rather than
 * "was switched on".
 *
 * Built as a `Keyframe` rather than a spring. A custom worklet entrance
 * would give a truer spring, but Reanimated's web build refuses anything
 * that isn't a predefined builder — it logs "Couldn't load entering/exiting
 * animation" and renders the element with no animation at all. Keyframes
 * compile to CSS keyframes on web and run on the UI thread on native, so
 * this is the only form that actually animates in both places.
 *
 * A new instance per call on purpose: `.delay()` and `.duration()` mutate the
 * builder and return it, so a shared module-level instance would leak one
 * call site's delay into every other.
 */
export function morphIn(delay = 0, distance = 10) {
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

/**
 * The matching exit — shrinks back out the way it came instead of blinking
 * off. Deliberately quicker than the entrance: the user has already moved on.
 */
export function morphOut(distance = 6) {
  return new Keyframe({
    0: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] },
    100: {
      opacity: 0,
      transform: [{ translateY: distance }, { scale: 0.96 }],
      easing: Ease.out,
    },
  }).duration(170);
}

/**
 * Sheet entrance — rises from below with a soft settle and no scale.
 *
 * A sheet that scales looks like it's being projected; a sheet that slides
 * looks like it came from off-screen, which is where the user believes it
 * was. Distance is short because the modal's own backdrop fade is already
 * covering the first frames.
 */
export function sheetIn(delay = 0) {
  return new Keyframe({
    0: { opacity: 0, transform: [{ translateY: 32 }] },
    68: { opacity: 1, transform: [{ translateY: -3 }], easing: Ease.sheet },
    100: { opacity: 1, transform: [{ translateY: 0 }] },
  })
    .duration(400)
    .delay(delay);
}
