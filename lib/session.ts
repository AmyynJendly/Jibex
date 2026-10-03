import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { API_MODE, type ApiMode } from '../constants/backend';
import type { User } from '../types';
import { clearToken, getToken, saveToken } from './token';

/**
 * The signed-in driver: the token plus who it belongs to.
 *
 * Both halves live in the Keychain / Android Keystore (expo-secure-store),
 * never in plain storage — the Android app keeps its token unencrypted, and
 * that isn't copied here. Web has no secure store, so it falls back to
 * localStorage there (web is a development preview, not a target).
 *
 * The server identifies a driver two ways, and the endpoints disagree on
 * which they want: most take the driver record's id (`driverId`), while
 * notifications take the user account's id (`userId`). Both are kept.
 */
export interface Session {
  /** Which backend issued it — a mock session doesn't open the real app, and vice versa. */
  mode: ApiMode;
  user: User;
  /** The user account's id: what the notification endpoints take. */
  userId: string;
  /** The driver record's id: what runsheets, pickups, transfers and returns take. */
  driverId: string;
  companyId?: string;
  companyName?: string;
  phone?: string;
  /** The server's own labels, kept as sent: INTERNAL / EXTERNAL, SALARY / PER_PARCEL / HYBRID. */
  driverType?: string;
  paymentMode?: string;
}

const SESSION_KEY = 'jibex.auth.session';
const isWeb = Platform.OS === 'web';

let cached: Session | null | undefined;

async function readRaw(): Promise<string | null> {
  if (isWeb) return localStorage.getItem(SESSION_KEY);
  return SecureStore.getItemAsync(SESSION_KEY);
}

export async function saveSession(token: string, session: Session): Promise<void> {
  const raw = JSON.stringify(session);
  if (isWeb) localStorage.setItem(SESSION_KEY, raw);
  else await SecureStore.setItemAsync(SESSION_KEY, raw);
  await saveToken(token);
  cached = session;
  // Signed in again: the next expiry is a new event.
  askedToSignIn = false;
}

/** The stored session, or null when signed out (or its data no longer parses). */
export async function getSession(): Promise<Session | null> {
  if (cached !== undefined) return cached;
  try {
    const raw = await readRaw();
    cached = raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    cached = null;
  }
  return cached;
}

/**
 * Whether there's a session this build can use: a token, the driver it
 * belongs to, and issued by the backend the app is currently pointed at.
 * Switching the backend switch therefore signs the driver out, rather than
 * opening the real app with a mock token (or the other way round).
 */
export async function hasActiveSession(): Promise<boolean> {
  const [token, session] = await Promise.all([getToken().catch(() => null), getSession()]);
  return !!token && !!session && session.mode === API_MODE;
}

export async function clearSession(): Promise<void> {
  cached = null;
  if (isWeb) localStorage.removeItem(SESSION_KEY);
  else await SecureStore.deleteItemAsync(SESSION_KEY).catch(() => undefined);
  await clearToken().catch(() => undefined);
}

// ── Expiry ────────────────────────────────────────────────────────────────

type Listener = () => void;
const expiryListeners = new Set<Listener>();

/** Called once whenever the server rejects the stored token. Returns an unsubscribe. */
export function onSessionExpired(listener: Listener): () => void {
  expiryListeners.add(listener);
  return () => expiryListeners.delete(listener);
}

let expiring = false;
/**
 * The driver has already been asked to sign in again. The screen he was on
 * stays alive under the login screen and keeps asking for its data; each of
 * those requests fails too. Without this, every one of them would open
 * another login screen.
 */
let askedToSignIn = false;

/** Who was signed in when the session last expired — so the same driver can pick up where he was. */
let expiredDriverId: string | null = null;
export function lastExpiredDriverId(): string | null {
  return expiredDriverId;
}

/**
 * The server said the token is no longer good (24 h old, or revoked — there
 * is no refresh). Signs out and tells whoever is listening, once, even if a
 * handful of requests in flight all come back 401 together.
 */
export async function expireSession(): Promise<void> {
  if (expiring || askedToSignIn) return;
  expiring = true;
  try {
    const session = await getSession().catch(() => null);
    // Nobody was signed in: nothing expired, nothing to resume.
    if (!session) return;
    expiredDriverId = session.driverId;
    askedToSignIn = true;
    await clearSession();
    expiryListeners.forEach((listener) => listener());
  } finally {
    expiring = false;
  }
}
