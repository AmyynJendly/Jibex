/**
 * The first switch: which backend the app talks to.
 *
 * `EXPO_PUBLIC_API_MODE=real` in `.env.local` (gitignored) uses the real
 * server; anything else, or nothing, uses the built-in mock data. Expo bakes
 * `EXPO_PUBLIC_*` values into the bundle and Metro caches this file, so
 * restart with `npx expo start --clear` after changing any switch — a plain
 * restart can keep the old value.
 *
 * `services/api.ts` picks the mock or the real version of each function.
 */
export type ApiMode = 'mock' | 'real';

export const API_MODE: ApiMode = process.env.EXPO_PUBLIC_API_MODE === 'real' ? 'real' : 'mock';

/**
 * The second switch: whether the app may CHANGE anything on the real server.
 *
 * `EXPO_PUBLIC_API_WRITES=on` lets real mode send its writes (confirming a
 * run, delivered / failed, pickups, returns, transfers, read receipts).
 * Anything else, or nothing, keeps them off: the app still reads the real
 * server, but every action that would change server data answers "Not
 * connected to the server yet" and leaves the screen as it was. Mock mode
 * ignores this switch. Same `--clear` rule as above when changing it.
 */
export const API_WRITES: boolean = process.env.EXPO_PUBLIC_API_WRITES === 'on';

/**
 * The third switch: the delivery code (OTP). `EXPO_PUBLIC_OTP` =
 *
 *  - `off`  — the OTP rule is disabled. A parcel with nothing of value to
 *             collect is delivered like any other (the call rule still
 *             applies). No delivery call asks for a verified code.
 *  - `mock` — the code is made up on the phone and shown in a "MODE TEST"
 *             banner, so the flow can be tried with no SMS. Mock data only.
 *  - `real` — the real OTP API (see OTP.md). For when it exists.
 *
 * With nothing set: `mock` on mock data, `off` on the real server — a real
 * delivery is never blocked because the OTP API is missing.
 *
 * `mock` is refused on the real server and reads as `off`: a code invented
 * by the phone, and shown to the driver, proves nothing about a real parcel.
 */
export type OtpMode = 'off' | 'mock' | 'real';

export function otpModeFor(apiMode: ApiMode, setting: string | undefined): OtpMode {
  const value = setting?.trim().toLowerCase();
  if (value === 'off') return 'off';
  if (value === 'real') return 'real';
  if (value === 'mock') return apiMode === 'mock' ? 'mock' : 'off';
  return apiMode === 'mock' ? 'mock' : 'off';
}

export const OTP_MODE: OtpMode = otpModeFor(API_MODE, process.env.EXPO_PUBLIC_OTP);

/** The live server. `EXPO_PUBLIC_API_BASE_URL` overrides it (a staging server, say). */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://jibex.cloud/';

/** How long a request may take before it's treated as a network failure. */
export const API_TIMEOUT_MS = 20_000;
