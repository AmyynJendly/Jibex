/**
 * Where the driver goes after signing in.
 *
 * A token lasts 24 hours and can't be renewed, so a driver in the middle of
 * his day does get signed out. When that happens the login screen opens ON
 * TOP of the screen he was on; that screen stays alive underneath with
 * everything he had typed or ticked. Signing in again closes the login
 * screen and he is back where he was.
 *
 *  - `'back'`: the same driver signed in again after an expiry, and there is
 *    a screen underneath to return to.
 *  - `'home'`: a normal sign-in, or a DIFFERENT driver signed in — the screen
 *    underneath belongs to someone else, so everything is cleared.
 */
export type AfterLogin = 'back' | 'home';

export function afterLogin(input: {
  /** The login screen was opened by a session expiry. */
  resumed: boolean;
  /** There is a screen under the login screen. */
  canGoBack: boolean;
  /** Who was signed in when the session expired. */
  expiredDriverId: string | null;
  /** Who just signed in. */
  driverId: string | null;
}): AfterLogin {
  if (!input.resumed || !input.canGoBack) return 'home';
  if (!input.expiredDriverId || !input.driverId) return 'home';
  return input.expiredDriverId === input.driverId ? 'back' : 'home';
}
