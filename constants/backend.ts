/**
 * Which backend the app talks to — the one switch for the whole app.
 *
 * Set `EXPO_PUBLIC_API_MODE=real` in `.env.local` (gitignored) and restart
 * with `npx expo start --clear` to use the real server; anything else, or
 * nothing, means the built-in mock data. Expo bakes `EXPO_PUBLIC_*` values
 * into the bundle, and Metro keeps its cached copy of this file unless
 * `--clear` is passed — a plain restart can keep the old mode.
 *
 * While the backend is being connected piece by piece, "real" only covers
 * what `services/real-api.ts` implements; everything else still answers from
 * the mock (see `services/api.ts`).
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

/** Real mode with writes switched off — the one case where actions are refused on the phone. */
export const SERVER_WRITES_OFF: boolean = API_MODE === 'real' && !API_WRITES;

/** The live server. `EXPO_PUBLIC_API_BASE_URL` overrides it (a staging server, say). */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://jibex.cloud/';

/** How long a request may take before it's treated as a network failure. */
export const API_TIMEOUT_MS = 20_000;
