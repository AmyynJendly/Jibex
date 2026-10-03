/**
 * Whether the scanner's camera should be on.
 *
 * Only while the scanner is the screen in front and the app is open. A
 * camera left running behind another screen, or in the background, drains
 * the battery for nothing — and iOS allows one camera preview at a time, so
 * it is unmounted, not just hidden.
 */
export function cameraOn(state: {
  /** The driver allowed the camera. */
  granted: boolean;
  /** Everything expected was scanned: the screen shows its "all done" state. */
  done: boolean;
  /** The scanner is the focused screen. */
  focused: boolean;
  /** The app is in the foreground. */
  appActive: boolean;
}): boolean {
  return state.granted && !state.done && state.focused && state.appActive;
}
