/**
 * The real Jibex backend (https://jibex.cloud), behind the same function
 * names and result shapes as `mock-api.ts`, so screens don't care which one
 * answers. `services/api.ts` picks per function.
 *
 * Connected so far: login, and the signed-in driver's details that come
 * with it. Everything else still answers from the mock.
 *
 * Three small layers, top to bottom:
 *   1. HTTP client  — base URL, the Bearer token, errors, and 401 → sign out
 *   2. Field mapper — the server's field names onto our types
 *   3. Enum mapper  — the server's status / reason values onto ours, both ways
 */

import { API_BASE_URL, API_TIMEOUT_MS } from '../constants/backend';
import { clearSession, expireSession, getSession, saveSession, type Session } from '../lib/session';
import { getToken } from '../lib/token';
import type {
  DeliveryFailureReason,
  JobStatus,
  PickupStatus,
  RunsheetStatus,
  TransferStatus,
  User,
} from '../types';
import type { LoginResult } from './mock-api';

// ═══════════════════════════════════════════════════════════════════════════
// 1. HTTP client
// ═══════════════════════════════════════════════════════════════════════════

/** A request that didn't produce a usable answer. `status` is 0 when the server was never reached. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    /** The server's own error text, when it sent one (often in French). */
    public readonly serverMessage?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Send the stored token. Only the login call goes without. */
  auth?: boolean;
}

function urlFor(path: string): string {
  return API_BASE_URL.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '');
}

/** The server's error text: Spring sends `{error}` from our controllers, `{error, message}` from its own. */
async function readServerMessage(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { error?: unknown; message?: unknown };
    const text = typeof body.message === 'string' ? body.message : body.error;
    return typeof text === 'string' ? text : undefined;
  } catch {
    return undefined;
  }
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const token = auth ? await getToken().catch(() => null) : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(urlFor(path), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    // Offline, DNS, TLS, or the timeout above: the server never answered.
    throw new ApiError(0, 'network');
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const serverMessage = await readServerMessage(response);
    // The token is dead (24 h old or revoked; there's no refresh): sign out
    // and send the driver back to login. Not for the login call itself,
    // where a 401 just means a wrong password.
    if (response.status === 401 && auth) {
      await expireSession();
    }
    throw new ApiError(response.status, `HTTP ${response.status}`, serverMessage);
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. Field mapper
// ═══════════════════════════════════════════════════════════════════════════

/** `POST /api/auth/login` as the server sends it. Every field is treated as optional. */
export interface ApiLoginResponse {
  token?: string | null;
  role?: string | null;
  portal?: string | null;
  user?: ApiLoginUser | null;
}

export interface ApiLoginUser {
  id?: number | string | null;
  driverId?: number | string | null;
  username?: string | null;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  active?: boolean | null;
  type?: string | null;
  paymentMode?: string | null;
  companyId?: number | string | null;
  companyName?: string | null;
  role?: string | null;
}

function idString(value: number | string | null | undefined): string | undefined {
  return value === null || value === undefined || value === '' ? undefined : String(value);
}

function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');
}

/**
 * Their user onto our `User`. The server has no driver code of its own, so
 * the driver record's id stands in as one ("DRV-12"): it's the number the
 * agency sees for this driver.
 */
export function toUser(apiUser: ApiLoginUser): User {
  const driverId = idString(apiUser.driverId) ?? idString(apiUser.id) ?? '';
  const username = apiUser.username?.trim() ?? '';
  const name = apiUser.fullName?.trim() || username;
  return {
    id: driverId,
    name,
    username,
    email: apiUser.email?.trim() ?? '',
    avatarInitials: initialsOf(name),
    driverCode: driverId ? `DRV-${driverId}` : '',
  };
}

/** Everything the app keeps about the signed-in driver. */
export function toSession(apiUser: ApiLoginUser): Session {
  const user = toUser(apiUser);
  return {
    mode: 'real',
    user,
    userId: idString(apiUser.id) ?? user.id,
    driverId: user.id,
    companyId: idString(apiUser.companyId),
    companyName: apiUser.companyName?.trim() || undefined,
    phone: apiUser.phone?.trim() || undefined,
    driverType: apiUser.type ?? undefined,
    paymentMode: apiUser.paymentMode ?? undefined,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. Enum mapper
// ═══════════════════════════════════════════════════════════════════════════
// The server's values, from its source code. Only the role check is in use
// yet; the rest is ready for the endpoints that come next. Anything the
// server sends that isn't listed maps to null (or undefined) rather than
// guessing, so an unexpected value shows up as missing, not as wrong.

export function isDriverRole(role: string | null | undefined): boolean {
  return role?.toUpperCase() === 'DRIVER';
}

/**
 * Runsheet status. Ours has three states; theirs has seven:
 * waiting for the driver's receipt → A_CONFIRMER, being worked → EN_COURS,
 * finished → VALIDE. DRAFT and CANCELLED never reach a driver's list.
 */
export function toRunsheetStatus(status: string | null | undefined): RunsheetStatus | null {
  switch (status) {
    case 'PENDING':
    case 'VALIDATED':
      return 'A_CONFIRMER';
    case 'DRIVER_CONFIRMED':
    case 'IN_PROGRESS':
      return 'EN_COURS';
    case 'COMPLETED':
      return 'VALIDE';
    default:
      return null;
  }
}

/**
 * A runsheet item's status onto a parcel's. PENDING_DRIVER_CONFIRMATION is
 * a parcel dispatch added after the driver signed — still to deliver.
 * RETURNED counts as not delivered.
 */
export function toJobStatus(status: string | null | undefined): JobStatus | null {
  switch (status) {
    case 'PENDING':
    case 'PENDING_DRIVER_CONFIRMATION':
      return 'PENDING';
    case 'DELIVERED':
      return 'DELIVERED';
    case 'FAILED':
    case 'RETURNED':
      return 'FAILED';
    default:
      return null;
  }
}

/** The other way, for `PUT /api/runsheets/items/{id}/status`. */
export function fromJobStatus(status: JobStatus): 'PENDING' | 'DELIVERED' | 'FAILED' {
  if (status === 'DELIVERED' || status === 'FAILED') return status;
  return 'PENDING';
}

const FAILURE_REASONS: readonly DeliveryFailureReason[] = [
  'ABSENT',
  'REFUSED',
  'WRONG_ADDRESS',
  'INCOMPLETE_ADDRESS',
  'PHONE_OFF',
  'NO_ANSWER',
  'OTHER',
  'CANCELLED_BY_CLIENT',
  'NOT_INTERESTED_2ND_ATTEMPT',
  'WRONG_NUMBER_2ND_ATTEMPT',
  'DUPLICATE_ORDER',
  'RETURN_CONFIRMED_BY_SENDER',
  'NON_COMPLIANT_ORDER',
  'INCORRECT_AMOUNT',
  'NOT_AVAILABLE_RESCHEDULED',
  'UNRELIABLE_CLIENT',
  'CALL_REFUSED',
  'LINE_BUSY',
  'WRONG_PAYMENT_MODE',
  'PARCEL_POSTPONED',
  'FORCE_MAJEURE',
];

/** Failure reasons use the server's names on both sides; this only rejects ones we don't know. */
export function toFailureReason(reason: string | null | undefined): DeliveryFailureReason | undefined {
  return FAILURE_REASONS.find((known) => known === reason);
}

export function fromFailureReason(reason: DeliveryFailureReason): string {
  return reason;
}

/** Pickups: anything not yet collected is still to do. CANCELLED isn't shown. */
export function toPickupStatus(status: string | null | undefined): PickupStatus | null {
  switch (status) {
    case 'PENDING':
    case 'SCHEDULED':
    case 'IN_PROGRESS':
      return 'SCHEDULED';
    case 'COMPLETED':
      return 'COMPLETED';
    default:
      return null;
  }
}

/** Transfers, including the legacy values older transfers still carry. */
export function toTransferStatus(status: string | null | undefined): TransferStatus | null {
  switch (status) {
    case 'READY_FOR_PICKUP':
    case 'IN_TRANSIT':
    case 'PENDING':
    case 'ACCEPTED':
    case 'VALIDATED':
    case 'SHIPPED':
      return 'IN_PROGRESS';
    case 'COMPLETED':
    case 'RECEIVED':
    case 'CLOSED':
      return 'COMPLETED';
    default:
      return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Endpoints
// ═══════════════════════════════════════════════════════════════════════════

/**
 * `POST /api/auth/login`. Signs the driver in and keeps the session in the
 * secure store. Accounts that aren't drivers are turned away here — the
 * same login serves the agency portal, and an agent's token must not open
 * the driver app.
 */
export async function login(username: string, password: string): Promise<LoginResult> {
  let response: ApiLoginResponse;
  try {
    response = await request<ApiLoginResponse>('api/auth/login', {
      method: 'POST',
      body: { username, password },
      auth: false,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401 || error.status === 400) {
        return { success: false, error: 'auth.login.errors.invalidCredentials' };
      }
      if (error.status === 0) return { success: false, error: 'auth.login.errors.network' };
    }
    return { success: false, error: 'common.genericError' };
  }

  const token = response?.token;
  const apiUser = response?.user;
  if (!token || !apiUser) {
    return { success: false, error: 'common.genericError' };
  }
  if (!isDriverRole(response.role) && !isDriverRole(apiUser.role)) {
    return { success: false, error: 'auth.login.errors.notDriver' };
  }
  if (apiUser.active === false) {
    return { success: false, error: 'auth.login.errors.inactive' };
  }

  const session = toSession(apiUser);
  if (!session.driverId) {
    return { success: false, error: 'auth.login.errors.notDriver' };
  }

  await saveSession(token, session);
  return { success: true, user: session.user, token };
}

/** The signed-in driver, from the session saved at login — no request needed. */
export async function getUser(): Promise<User> {
  const session = await getSession();
  if (!session || session.mode !== 'real') {
    throw new ApiError(401, 'not signed in');
  }
  return { ...session.user };
}

export async function logout(): Promise<void> {
  await clearSession();
}
