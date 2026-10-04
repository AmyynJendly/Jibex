/**
 * Fallback contact details, shown only when the driver's agency has none on
 * file. The app first uses the agency's own phone and email from the data it
 * already loads (see `getDispatchContact` and lib/dispatchContact).
 *
 * ⚠️ PLACEHOLDERS — REPLACE BEFORE RELEASE. Both values below were made up
 * while building the app. Neither is confirmed as a real Jibex number or
 * mailbox, so a driver who reaches them today may reach a stranger or
 * nothing. Put a real fallback here — this is the only place either appears.
 */

/** PLACEHOLDER. Called from login ("Forgot password? Call Dispatch"). */
export const DISPATCH_PHONE = '+216 71 200 300';

/** PLACEHOLDER. Opened from Help Center → Contact Support. */
export const SUPPORT_EMAIL = 'support@jibex.app';
