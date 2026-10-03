/**
 * The real Jibex backend (https://jibex.cloud), behind the same function
 * names and result shapes as `mock-api.ts`, so screens don't care which one
 * answers. `services/api.ts` picks per function.
 *
 * Connected so far (read-only apart from login):
 *   - login, and the signed-in driver's details that come with it
 *   - GET /api/runsheets/driver/{driverId}/active  → the driver's runsheets
 *   - GET /api/runsheets?driverId={driverId}       → every runsheet, for history and totals
 *   - GET /api/runsheets/{id}                      → one runsheet with its items
 *   - GET /api/pickup-requests/driver/{driverId}   → pickups
 *   - GET /api/pickup-requests/{id}/parcels        → a pickup's parcels
 *   - GET /api/transfers/driver/{driverId}         → transfers
 *   - GET /api/transfers/{id}                      → one transfer
 *   - GET /api/return-management/driver/{driverId}/assigned → returns
 *   - GET /api/notifications/user/{userId}         → notifications (USER id)
 *
 * Writes — built, and switched OFF unless `EXPO_PUBLIC_API_WRITES=on`. While
 * off, each answers "Not connected to the server yet" without a request:
 *   - PUT  /api/runsheets/{id}/driver-confirm, /start, /confirm-new-parcels
 *   - PUT  /api/runsheets/{id}/driver-reject, /reject-new-parcels  {reason}
 *   - PUT  /api/runsheets/items/{itemId}/status  {status, failureReason?, notes?}
 *   - PUT  /api/pickup-requests/{id}/start, /complete
 *   - POST /api/transfers/{id}/confirm-pickup?driverId=
 *   - POST /api/return-management/driver/{driverId}/confirm-loaded
 *   - POST /api/return-management/{parcelId}/confirm-delivered?driverId=
 *   - PUT  /api/notifications/{id}/read, /api/notifications/user/{userId}/read-all
 * Every write updates the screen only after the server says yes. Deleting
 * an alert and marking one unread have no server endpoint at all; those
 * stay on the phone (lib/deviceStore), as does the GPS fix taken on a
 * failed delivery.
 *
 * Three small layers, top to bottom:
 *   1. HTTP client  — base URL, the Bearer token, errors, and 401 → sign out
 *   2. Field mapper — the server's field names onto our types
 *   3. Enum mapper  — the server's status / reason values onto ours, both ways
 */

import { API_BASE_URL, API_TIMEOUT_MS, API_WRITES } from '../constants/backend';
import { reasonNeedsNote } from '../lib/failureReasons';
import { failureNotes, failureProofLine } from '../lib/failureProof';
import { governorateIn, governorateOfCity } from '../lib/governorates';
import { jobStatusOfParcel } from '../lib/parcelStatus';
import { findExact } from '../lib/parcelSearch';
import * as device from '../lib/deviceStore';
import { localeTag, toDateKey } from '../lib/date';
import { dayRuns, lockedStopIds } from '../lib/runsheetDay';
import { i18next } from '../lib/i18n';
import { nearestFirstByArea } from '../lib/route';
import { driverPosition } from '../lib/driverPosition';
import { clearSession, expireSession, getSession, saveSession, type Session } from '../lib/session';
import { getToken } from '../lib/token';
import type {
  DeliveryFailureReason,
  GeoPoint,
  Job,
  JobStatus,
  Notification,
  NotificationTarget,
  NotificationType,
  Pickup,
  PickupStatus,
  Return,
  ReturnStatus,
  Runsheet,
  RunsheetStatus,
  Transfer,
  TransferStatus,
  TransferType,
  User,
  Vehicle,
  WriteResult,
  BatchWriteResult,
  DriverStats,
  DispatchContact,
} from '../types';
import type {
  ConfirmDeliveryResult,
  FailDeliveryResult,
  LoginResult,
  RunsheetWriteResult,
  ScanResult,
} from './mock-api';

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

/** A parcel as the runsheet endpoints send it (a JPA entity, so most fields can be null). */
export interface ApiParcel {
  id?: number | string | null;
  trackingNumber?: string | null;
  status?: string | null;
  recipientName?: string | null;
  recipientPhone?: string | null;
  recipientAddress?: string | null;
  recipientCity?: string | null;
  recipientLat?: number | null;
  recipientLng?: number | null;
  senderName?: string | null;
  senderPhone?: string | null;
  senderAgencyName?: string | null;
  agencyName?: string | null;
  agencyCity?: string | null;
  destinationAgencyName?: string | null;
  destinationAgencyCity?: string | null;
  destinationAgency?: { name?: string | null; city?: string | null } | null;
  companyName?: string | null;
  driverName?: string | null;
  price?: number | null;
  deliveryFee?: number | null;
  amountToCollect?: number | null;
  isPaid?: boolean | null;
  weight?: number | null;
  description?: string | null;
  pieces?: number | null;
  type?: string | null;
  fragile?: boolean | null;
  exchange?: boolean | null;
  lastScanLocation?: string | null;
  lastScanTime?: string | null;
  pickedUpAt?: string | null;
  deliveredAt?: string | null;
  createdAt?: string | null;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  deliveryPhotoUrl?: string | null;
  deliverySignatureUrl?: string | null;
  deliveryNotes?: string | null;
  deliveryAttempts?: number | null;
  failureReason?: string | null;
  failureNotes?: string | null;
  returnType?: string | null;
}

export interface ApiRunsheetItem {
  id?: number | string | null;
  status?: string | null;
  sequenceOrder?: number | null;
  failureReason?: string | null;
  notes?: string | null;
  deliveredAt?: string | null;
  scannedAt?: string | null;
  parcel?: ApiParcel | null;
}

export interface ApiRunsheet {
  id?: number | string | null;
  code?: string | null;
  status?: string | null;
  scheduledDate?: string | null;
  totalParcels?: number | null;
  notes?: string | null;
  createdAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  vehiclePlate?: string | null;
  deliveredParcels?: number | null;
  failedParcels?: number | null;
  driver?: { id?: number | string | null; fullName?: string | null } | null;
  agency?: ApiNamed | null;
  items?: ApiRunsheetItem[] | null;
}

const text = (value: string | null | undefined) => value?.trim() || undefined;
const num = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

function point(lat: number | null | undefined, lng: number | null | undefined): GeoPoint | undefined {
  const la = num(lat);
  const ln = num(lng);
  return la === undefined || ln === undefined ? undefined : { lat: la, lng: ln };
}

/**
 * A parcel onto our `Job`. The tracking number is the id, as on mock data —
 * it's what's printed on the box and what the stop screen's route carries;
 * the server's numeric ids ride along in `server` for the write-back phase.
 *
 * Cash: the driver collects `price` at the door — confirmed by the backend
 * team, and what the Android app shows. `amountToCollect` (price minus the
 * delivery fee) and `deliveryFee` stay in `server` as data, never shown as
 * the amount to collect. A parcel with no price falls back to
 * `amountToCollect`, then to nothing to collect.
 */
export function toJob(parcel: ApiParcel, item?: ApiRunsheetItem, runsheetId?: string): Job {
  const id = text(parcel.trackingNumber) ?? `P-${idString(parcel.id) ?? idString(item?.id) ?? '?'}`;
  const itemStatus = item ? text(item.status) : undefined;
  const parcelStatus = text(parcel.status);
  const status =
    (item ? toJobStatus(itemStatus) : toJobStatusFromParcel(parcelStatus)) ??
    // A status we don't know yet: shown as still to do, raw value kept below.
    'PENDING';
  const rawReason = text(item?.failureReason) ?? text(parcel.failureReason);
  const failureReason = toFailureReason(rawReason);
  const amountToCollect = num(parcel.amountToCollect);
  const price = num(parcel.price) ?? amountToCollect;
  const calls = device.callsFor(id);

  return {
    id,
    customerName: text(parcel.recipientName) ?? '—',
    customerPhone: text(parcel.recipientPhone) ?? '',
    address: [text(parcel.recipientAddress), text(parcel.recipientCity)].filter(Boolean).join(', '),
    packageInfo: {
      count: num(parcel.pieces) ?? 1,
      weightKg: num(parcel.weight) ?? 0,
      fragile: parcel.fragile === true,
      note: text(item?.notes) ?? text(parcel.deliveryNotes),
    },
    status,
    cashToCollect: price ?? 0,
    cashCollected: status === 'DELIVERED' ? price : undefined,
    location: point(parcel.recipientLat, parcel.recipientLng),
    governorate: governorateOfCity(parcel.recipientCity),
    failureReason: status === 'FAILED' ? failureReason : undefined,
    failureNote: text(item?.notes) ?? text(parcel.failureNotes),
    // Kept on the phone when the failure was recorded here; the server has no field for it.
    failureLocation: status === 'FAILED' ? device.failureLocationFor(id) : undefined,
    proofPhotoUri: text(parcel.deliveryPhotoUrl),
    callAttempts: calls.length,
    lastCallAt: calls.at(-1),
    deliveryAttempts: num(parcel.deliveryAttempts),
    exchange: parcel.exchange === true ? true : undefined,
    server: {
      parcelId: idString(parcel.id) ?? '',
      itemId: idString(item?.id),
      runsheetId,
      sequenceOrder: num(item?.sequenceOrder),
      itemStatus,
      parcelStatus,
      unknownFailureReason: rawReason && !failureReason ? rawReason : undefined,
      price: num(parcel.price),
      amountToCollect,
      deliveryFee: num(parcel.deliveryFee),
      isPaid: parcel.isPaid ?? undefined,
      description: text(parcel.description),
      parcelType: text(parcel.type),
      senderName: text(parcel.senderName),
      senderPhone: text(parcel.senderPhone),
      senderAgencyName: text(parcel.senderAgencyName),
      agencyName: text(parcel.agencyName),
      agencyCity: text(parcel.agencyCity),
      destinationAgencyName: text(parcel.destinationAgencyName) ?? text(parcel.destinationAgency?.name),
      destinationAgencyCity: text(parcel.destinationAgencyCity) ?? text(parcel.destinationAgency?.city),
      companyName: text(parcel.companyName),
      driverName: text(parcel.driverName),
      lastScanLocation: text(parcel.lastScanLocation),
      lastScanTime: text(parcel.lastScanTime),
      pickedUpAt: text(parcel.pickedUpAt),
      deliveredAt: text(item?.deliveredAt) ?? text(parcel.deliveredAt),
      createdAt: text(parcel.createdAt),
      deliveryLocation: point(parcel.deliveryLat, parcel.deliveryLng),
      deliveryPhotoUrl: text(parcel.deliveryPhotoUrl),
      deliverySignatureUrl: text(parcel.deliverySignatureUrl),
      deliveryAttempts: num(parcel.deliveryAttempts),
      returnType: text(parcel.returnType),
    },
  };
}

/** A runsheet's parcels in dispatch's stop order (`sequenceOrder`, then as listed). */
export function runsheetJobs(runsheet: ApiRunsheet): Job[] {
  const runsheetId = idString(runsheet.id);
  const runsheetStatus = text(runsheet.status);
  return [...(runsheet.items ?? [])]
    .map((item, index) => ({ item, index }))
    .sort(
      (a, b) =>
        (num(a.item.sequenceOrder) ?? Number.MAX_SAFE_INTEGER) -
          (num(b.item.sequenceOrder) ?? Number.MAX_SAFE_INTEGER) || a.index - b.index
    )
    .filter(({ item }) => item.parcel)
    .map(({ item }) => {
      const job = toJob(item.parcel!, item, runsheetId);
      if (job.server) job.server.runsheetStatus = runsheetStatus;
      job.run = { code: text(runsheet.code), date: text(runsheet.scheduledDate)?.slice(0, 10) };
      return job;
    });
}

/**
 * The delivery area, from the parcels' cities ("Tunis, Sidi Hassine" →
 * "Tunis"). The server has no zone of its own; the agency name stands in
 * when the parcels don't say.
 */
function zoneOf(runsheet: ApiRunsheet): string {
  const governorates = [
    ...new Set(
      (runsheet.items ?? [])
        .map((item) => text(item.parcel?.recipientCity)?.split(',')[0]?.trim())
        .filter((city): city is string => !!city)
    ),
  ];
  if (governorates.length) return governorates.slice(0, 2).join(', ');
  return text(runsheet.agency?.name) ?? text(runsheet.code) ?? '';
}

/**
 * A runsheet onto ours, or null for one a driver shouldn't see (a draft, or
 * a cancelled run). A status we don't know yet is treated as waiting for the
 * driver's confirmation — its parcels stay locked rather than open to
 * updates nobody has thought through.
 */
export function toRunsheet(runsheet: ApiRunsheet): Runsheet | null {
  const raw = text(runsheet.status);
  if (raw === 'DRAFT' || raw === 'CANCELLED') return null;
  const status = toRunsheetStatus(raw) ?? 'A_CONFIRMER';
  const jobs = runsheetJobs(runsheet);
  const items = runsheet.items ?? [];
  const delivered = jobs.filter((job) => job.status === 'DELIVERED').length;
  const newParcels = items.filter((item) => item.status === 'PENDING_DRIVER_CONFIRMATION').length;
  // Confirmed but not started: parcels can't be updated yet (the server only
  // takes updates on an IN_PROGRESS run), so it stays on the to-do cards.
  const needsStart = raw === 'DRIVER_CONFIRMED';

  return {
    id: idString(runsheet.id) ?? '',
    code: text(runsheet.code),
    zone: zoneOf(runsheet),
    agency: text(runsheet.agency?.name) ?? '',
    status,
    stopCount: jobs.length || (num(runsheet.totalParcels) ?? 0),
    deliveredCount: delivered,
    needsConfirmation: status === 'A_CONFIRMER' || needsStart || newParcels > 0,
    completionPercent: jobs.length ? Math.round((delivered / jobs.length) * 100) : 0,
    stopIds: jobs.map((job) => job.id),
    vehiclePlate: text(runsheet.vehiclePlate),
    needsStart,
    newParcelsCount: newParcels,
    confirmedStopCount: status === 'A_CONFIRMER' ? undefined : Math.max(0, jobs.length - newParcels),
    newStopIds: jobs.filter((job) => job.server?.itemStatus === 'PENDING_DRIVER_CONFIRMATION').map((job) => job.id),
    serverStatus: raw,
    scheduledDate: text(runsheet.scheduledDate)?.slice(0, 10),
    closedAt: status === 'VALIDE' ? text(runsheet.completedAt) : undefined,
  };
}

// ── Pickups, transfers, returns, notifications ────────────────────────────
// Some nested objects the server sends are whole database records — a
// merchant's bank details and national id on `sender`, a driver's national
// id, licence and salary on `assignedDriver`/`driver`. Only the fields below
// are ever read; nothing else is mapped, stored or shown.

export interface ApiPickup {
  id?: number | string | null;
  requestNumber?: string | null;
  status?: string | null;
  pickupAddress?: string | null;
  pickupCity?: string | null;
  contactPerson?: string | null;
  contactPhone?: string | null;
  scheduledAt?: string | null;
  requestedDate?: string | null;
  timeSlot?: string | null;
  estimatedParcelsCount?: number | null;
  notes?: string | null;
  completedAt?: string | null;
  createdAt?: string | null;
  sender?: {
    id?: number | string | null;
    name?: string | null;
    senderName?: string | null;
    phone?: string | null;
    address?: string | null;
    ville?: string | null;
    gouvernorat?: string | null;
  } | null;
}

/** An agency (or company) as nested in runsheets and transfers. Only these fields are read. */
interface ApiNamed {
  id?: number | string | null;
  name?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  /** The agency manager's number — the fallback when the agency has no phone of its own. */
  managerPhone?: string | null;
}

export interface ApiTransfer {
  id?: number | string | null;
  transferNumber?: string | null;
  status?: string | null;
  transferType?: string | null;
  fromAgency?: ApiNamed | null;
  toAgency?: ApiNamed | null;
  fromCompany?: ApiNamed | null;
  toCompany?: ApiNamed | null;
  driver?: { id?: number | string | null; fullName?: string | null } | null;
  driverName?: string | null;
  vehicleRegistration?: string | null;
  parcels?: { trackingNumber?: string | null }[] | null;
  notes?: string | null;
  scannedCount?: number | null;
  scanDeparture?: boolean | null;
  scanArrival?: boolean | null;
  missingParcels?: number | null;
  extraParcels?: number | null;
  damagedParcels?: number | null;
  discrepancyNotes?: string | null;
  createdAt?: string | null;
  validatedAt?: string | null;
  shippedAt?: string | null;
  confirmedAt?: string | null;
  receivedAt?: string | null;
  completedAt?: string | null;
  closedAt?: string | null;
  cancelledAt?: string | null;
}

export interface ApiNotification {
  id?: number | string | null;
  title?: string | null;
  message?: string | null;
  type?: string | null;
  isRead?: boolean | null;
  createdAt?: string | null;
  referenceId?: number | string | null;
  referenceType?: string | null;
}

/** A clock time in the app's language, e.g. "14:30" or "2:30 PM". */
function clockTime(iso: string | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(localeTag(i18next.language), { hour: '2-digit', minute: '2-digit' });
}

/**
 * The pickup's address with its city. The server's `pickupCity` is always
 * empty, so the city comes from the first place that has one: the sender's
 * own city fields, then a governorate named in the pickup address, then in
 * the sender's address. It isn't repeated when the address already says it.
 */
function pickupAddressLine(apiPickup: ApiPickup): string {
  const address = text(apiPickup.pickupAddress);
  const sender = apiPickup.sender;
  const city =
    text(apiPickup.pickupCity) ??
    text(sender?.ville) ??
    text(sender?.gouvernorat) ??
    governorateIn(address) ??
    governorateIn(sender?.address);
  const alreadySaid = !!city && !!address && governorateIn(address) === governorateIn(city) && governorateIn(city) !== undefined;
  return [address, alreadySaid ? undefined : city].filter(Boolean).join(', ');
}

/**
 * A pickup request onto ours, or null for a cancelled one. Cash on its
 * parcels follows the same rule as runsheets (`price`).
 */
export function toPickup(apiPickup: ApiPickup, apiParcels?: ApiParcel[] | null): Pickup | null {
  const raw = text(apiPickup.status);
  if (raw === 'CANCELLED') return null;
  const parcels = (apiParcels ?? []).map((parcel) => ({
    trackingNumber: text(parcel.trackingNumber) ?? `P-${idString(parcel.id) ?? '?'}`,
    contactName: text(parcel.recipientName) ?? '—',
    address: [text(parcel.recipientAddress), text(parcel.recipientCity)].filter(Boolean).join(', '),
    codAmount: num(parcel.price) ?? num(parcel.amountToCollect) ?? 0,
  }));
  const scheduledAt = text(apiPickup.scheduledAt) ?? text(apiPickup.requestedDate) ?? text(apiPickup.createdAt);
  return {
    id: idString(apiPickup.id) ?? '',
    businessName: text(apiPickup.sender?.name) ?? text(apiPickup.sender?.senderName) ?? text(apiPickup.contactPerson) ?? '—',
    address: pickupAddressLine(apiPickup),
    // A status we don't know shows in the completed list — read-only, no actions.
    status: toPickupStatus(raw) ?? 'COMPLETED',
    requestedByDate: scheduledAt ?? '',
    timeWindow: text(apiPickup.timeSlot) ?? clockTime(scheduledAt),
    packageCount: parcels.length || (num(apiPickup.estimatedParcelsCount) ?? 0),
    contactName: text(apiPickup.contactPerson) ?? '',
    contactPhone: text(apiPickup.contactPhone) ?? text(apiPickup.sender?.phone) ?? '',
    parcels,
    server: {
      pickupId: idString(apiPickup.id) ?? '',
      requestNumber: text(apiPickup.requestNumber),
      status: raw,
      estimatedParcelsCount: num(apiPickup.estimatedParcelsCount),
      notes: text(apiPickup.notes),
      completedAt: text(apiPickup.completedAt),
    },
  };
}

/** A transfer onto ours, or null for a draft, cancelled or rejected one. */
export function toTransfer(apiTransfer: ApiTransfer): Transfer | null {
  const raw = text(apiTransfer.status);
  if (raw === 'DRAFT' || raw === 'CANCELLED' || raw === 'REJECTED') return null;
  const parcels = (apiTransfer.parcels ?? [])
    .map((parcel) => text(parcel?.trackingNumber))
    .filter((tracking): tracking is string => !!tracking);
  const rawType = text(apiTransfer.transferType);
  const from = apiTransfer.fromAgency;
  return {
    id: text(apiTransfer.transferNumber) ?? `TRF-${idString(apiTransfer.id) ?? '?'}`,
    // A status we don't know shows in history — read-only, no actions.
    status: toTransferStatus(raw) ?? 'COMPLETED',
    awaitingPickupConfirmation: raw === 'READY_FOR_PICKUP',
    originAgency: text(from?.name) ?? '—',
    destinationAgency: text(apiTransfer.toAgency?.name) ?? '—',
    parcelCount: parcels.length,
    parcelTrackingNumbers: parcels,
    // The handover happens where the batch leaves from.
    location: text(from?.city) ?? text(from?.name) ?? '',
    scheduledAt:
      text(apiTransfer.validatedAt) ?? text(apiTransfer.confirmedAt) ?? text(apiTransfer.createdAt) ?? '',
    server: {
      transferId: idString(apiTransfer.id) ?? '',
      status: raw,
      rawType,
      transferType: toTransferType(rawType),
      fromCompany: text(apiTransfer.fromCompany?.name),
      toCompany: text(apiTransfer.toCompany?.name),
      driverName: text(apiTransfer.driverName) ?? text(apiTransfer.driver?.fullName),
      vehicleRegistration: text(apiTransfer.vehicleRegistration),
      notes: text(apiTransfer.notes),
      parcelTrackingNumbers: parcels,
      scannedCount: num(apiTransfer.scannedCount),
      scanDeparture: apiTransfer.scanDeparture === true,
      scanArrival: apiTransfer.scanArrival === true,
      missingParcels: num(apiTransfer.missingParcels) ?? 0,
      extraParcels: num(apiTransfer.extraParcels) ?? 0,
      damagedParcels: num(apiTransfer.damagedParcels) ?? 0,
      discrepancyNotes: text(apiTransfer.discrepancyNotes),
      createdAt: text(apiTransfer.createdAt),
      validatedAt: text(apiTransfer.validatedAt),
      shippedAt: text(apiTransfer.shippedAt),
      confirmedAt: text(apiTransfer.confirmedAt),
      receivedAt: text(apiTransfer.receivedAt),
      completedAt: text(apiTransfer.completedAt),
      closedAt: text(apiTransfer.closedAt),
      cancelledAt: text(apiTransfer.cancelledAt),
    },
  };
}

/**
 * A returned parcel onto our `Return`. The server hands the driver single
 * parcels to take back to their sender, not agency batches, so each becomes
 * a return of one parcel: from the agency holding it, to the merchant.
 */
export function toReturn(parcel: ApiParcel & { senderAddress?: string | null; updatedAt?: string | null }): Return {
  const tracking = text(parcel.trackingNumber) ?? `P-${idString(parcel.id) ?? '?'}`;
  const raw = text(parcel.status);
  return {
    id: tracking,
    status: toReturnStatus(raw),
    stage: raw === 'RETOUR_A_CHARGER' ? 'TO_LOAD' : raw === 'EN_TRANSIT_RETOUR' ? 'TO_HAND_BACK' : undefined,
    fromAgency: text(parcel.senderAgencyName) ?? text(parcel.agencyName) ?? '—',
    toAgency: text(parcel.senderName) ?? '—',
    parcelCount: 1,
    location: text(parcel.senderAddress) ?? '',
    scheduledAt: text(parcel.lastScanTime) ?? text(parcel.updatedAt) ?? text(parcel.createdAt) ?? '',
    server: {
      parcelId: idString(parcel.id) ?? '',
      trackingNumber: tracking,
      parcelStatus: raw,
      senderName: text(parcel.senderName),
      senderPhone: text(parcel.senderPhone),
      senderAddress: text(parcel.senderAddress),
      returnType: text(parcel.returnType),
    },
  };
}

/**
 * Where tapping an alert should go, from what it references. A parcel is
 * opened directly when it's one of the driver's (`parcelTarget` resolves the
 * server's numeric id to our tracking-number id); anything else lands on the
 * list it belongs to.
 */
function targetOf(
  referenceType: string | undefined,
  referenceId: string | undefined,
  parcelTarget: (parcelId: string) => string | undefined
): NotificationTarget | undefined {
  const kind = referenceType?.toUpperCase() ?? '';
  if (kind.includes('PICKUP')) return { screen: 'pickups', tab: 'SCHEDULED' };
  if (kind.includes('TRANSFER')) return { screen: 'transfers', tab: 'current' };
  if (kind.includes('RETURN')) return { screen: 'returns', tab: 'current' };
  if (kind.includes('RUNSHEET')) return { screen: 'runsheets', tab: 'current' };
  if (kind.includes('PARCEL')) {
    const jobId = referenceId ? parcelTarget(referenceId) : undefined;
    return jobId ? { screen: 'job', jobId } : { screen: 'runsheets', tab: 'current' };
  }
  return undefined;
}

/**
 * A server notification. Its title and message are shown as the server
 * wrote them (one language for now); the raw type and reference are kept so
 * the app can write its own bilingual text later.
 */
export function toNotification(
  apiNotification: ApiNotification,
  parcelTarget: (parcelId: string) => string | undefined = () => undefined
): Notification {
  const rawType = text(apiNotification.type);
  const referenceType = text(apiNotification.referenceType);
  const referenceId = idString(apiNotification.referenceId);
  return {
    id: idString(apiNotification.id) ?? '',
    type: toNotificationType(rawType, referenceType),
    title: text(apiNotification.title) ?? '',
    message: text(apiNotification.message) ?? '',
    timestamp: text(apiNotification.createdAt) ?? new Date(0).toISOString(),
    read: apiNotification.isRead === true,
    target: targetOf(referenceType, referenceId, parcelTarget),
    server: { type: rawType, referenceId, referenceType },
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

/**
 * A parcel's own lifecycle status, for a parcel found by search rather than
 * on a runsheet line. Delivered and every return/closing state count as done;
 * everything on its way counts as in transit.
 */
export function toJobStatusFromParcel(status: string | null | undefined): JobStatus | null {
  return jobStatusOfParcel(status);
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

const TRANSFER_TYPES: readonly TransferType[] = ['INTER_AGENCY', 'HUB_RELAY', 'RETURN', 'RETURN_TO_SENDER'];

export function toTransferType(type: string | null | undefined): TransferType | undefined {
  return TRANSFER_TYPES.find((known) => known === type);
}

/**
 * A returned parcel's status. Only the ones still with the driver are open;
 * anything else (handed back, or a status we don't know) is read-only.
 */
export function toReturnStatus(status: string | null | undefined): ReturnStatus {
  return status === 'RETOUR_A_CHARGER' || status === 'EN_TRANSIT_RETOUR' ? 'PENDING_PICKUP' : 'PROCESSED';
}

/**
 * The server's notification kinds onto our five icons. Anything it sends
 * that isn't about the driver's work (complaints, system alerts, plain info)
 * or that we don't know becomes INFO.
 */
export function toNotificationType(
  type: string | null | undefined,
  referenceType?: string | null
): NotificationType {
  switch (type) {
    case 'PICKUP_REQUESTED':
    case 'PICKUP_ASSIGNED':
    case 'PICKUP_SCHEDULED':
      return 'PICKUP';
    case 'PARCEL_STATUS_CHANGE':
    case 'PARCEL_DELIVERED':
    case 'RUNSHEET_CREATED':
    case 'RUNSHEET_VALIDATED':
      return 'DELIVERY';
    case 'PARCEL_RETURNED':
      return 'RETURN';
    case 'PAYMENT_RECEIVED':
      return 'CASH';
  }
  const kind = `${type ?? ''} ${referenceType ?? ''}`.toUpperCase();
  if (kind.includes('TRANSFER')) return 'TRANSFER';
  if (kind.includes('RETURN')) return 'RETURN';
  if (kind.includes('PICKUP')) return 'PICKUP';
  return 'INFO';
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
  forgetDriverData();
  // Recent searches name customers: they don't stay for the next driver.
  await device.hydrateDeviceStore();
  await device.clearRecentSearches();
  await clearSession();
}

// ── The driver's runsheets ────────────────────────────────────────────────

interface DriverData {
  runsheets: Runsheet[];
  /** The same runsheets as the server sent them — for fields ours don't carry. */
  raw: ApiRunsheet[];
  /** Every parcel on those runsheets, runsheet by runsheet, each in stop order. */
  jobs: Job[];
  /** Which runsheet each parcel is on — how the driver's saved order is filed. */
  runsheetOf: Map<string, string>;
}

/**
 * One screen asks for runsheets, parcels and totals at once, and each of
 * those is a separate call here. They share one fetch: answered from the
 * same result for a few seconds, and a request already on its way is
 * joined rather than repeated.
 */
const DRIVER_DATA_TTL_MS = 3_000;
let driverData: { at: number; promise: Promise<DriverData> } | null = null;

function forgetDriverData() {
  driverData = null;
  pastRunsheets = null;
}

async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session || session.mode !== 'real') {
    await expireSession();
    throw new ApiError(401, 'not signed in');
  }
  return session;
}

async function fetchDriverData(): Promise<DriverData> {
  // The DRIVER record's id — not the user account's, which the
  // notification endpoints take. They can differ; see lib/session.
  const { driverId } = await requireSession();
  const [list] = await Promise.all([
    request<ApiRunsheet[] | null>(`api/runsheets/driver/${encodeURIComponent(driverId)}/active`),
    device.hydrateDeviceStore(),
  ]);

  // The list normally carries each runsheet's items; fetch any that doesn't.
  const full = await Promise.all(
    (list ?? []).map((runsheet) =>
      Array.isArray(runsheet.items) || runsheet.id === null || runsheet.id === undefined
        ? runsheet
        : request<ApiRunsheet>(`api/runsheets/${encodeURIComponent(String(runsheet.id))}`)
    )
  );

  const runsheets: Runsheet[] = [];
  const raw: ApiRunsheet[] = [];
  const jobs: Job[] = [];
  const runsheetOf = new Map<string, string>();
  for (const apiRunsheet of full) {
    const runsheet = toRunsheet(apiRunsheet);
    if (!runsheet) continue;
    runsheets.push(runsheet);
    raw.push(apiRunsheet);
    for (const job of runsheetJobs(apiRunsheet)) {
      if (runsheetOf.has(job.id)) continue;
      runsheetOf.set(job.id, runsheet.id);
      jobs.push(job);
    }
  }
  return { runsheets, raw, jobs, runsheetOf };
}

function loadDriverData(): Promise<DriverData> {
  if (driverData && Date.now() - driverData.at < DRIVER_DATA_TTL_MS) return driverData.promise;
  const promise = fetchDriverData();
  driverData = { at: Date.now(), promise };
  // A failed load isn't kept: the next screen to ask tries again.
  promise.catch(() => {
    if (driverData?.promise === promise) driverData = null;
  });
  return promise;
}

const copy = (job: Job): Job => ({ ...job, packageInfo: { ...job.packageInfo } });
const isOpen = (job: Job) => job.status !== 'DELIVERED' && job.status !== 'FAILED';

/**
 * The order the driver works open stops in.
 *
 *  - "Nearest first" on: by distance from the driver's position to each
 *    stop's governorate (the server sends no coordinates); same governorate
 *    keeps dispatch's order, unknown ones last. With no position (location
 *    refused, or no fix), dispatch's order — the screen says why.
 *  - Off: the driver's own drag order laid over dispatch's sequence (stops
 *    they haven't placed keep dispatch's order).
 */
async function orderOpen(jobs: Job[], runsheetOf: Map<string, string>): Promise<Job[]> {
  if (device.isNearestFirst()) {
    const { coords } = await driverPosition();
    return coords ? nearestFirstByArea(jobs, coords) : jobs;
  }
  return device.applyStopOrder(jobs, (id) => runsheetOf.get(id));
}

/** `GET /api/runsheets/driver/{driverId}/active`, drafts and cancelled runs left out. */
export async function getRunsheets(): Promise<Runsheet[]> {
  const { runsheets } = await loadDriverData();
  return runsheets.map((runsheet) => ({ ...runsheet, stopIds: [...runsheet.stopIds] }));
}

/**
 * Every parcel still to deliver, across the driver's runsheets. Delivered and
 * failed ones drop out (they're history). Parcels the driver can't act on
 * yet (a run not accepted, or a parcel just added) sit at the end, locked.
 */
export async function getActiveParcels(): Promise<Job[]> {
  const { runsheets, jobs, runsheetOf } = await loadDriverData();
  // On a run changed after the start, only the added parcels are locked.
  const locked = lockedStopIds(runsheets);
  const open = jobs.filter(isOpen);
  const workable = open.filter((job) => !locked.has(job.id));
  const blocked = open.filter((job) => locked.has(job.id));
  return [...(await orderOpen(workable, runsheetOf)), ...blocked].map(copy);
}

// ── Finished runsheets ────────────────────────────────────────────────────

/**
 * `GET /api/runsheets?driverId={driverId}` — every runsheet the driver ever
 * had, whatever its status, each with its items. Only the ones the agency
 * has closed (COMPLETED) are used from here; the open ones come from the
 * active endpoint above. Kept for a minute: history doesn't move fast, and
 * the list grows with every run.
 */
const PAST_RUNSHEETS_TTL_MS = 60_000;
let pastRunsheets: { at: number; promise: Promise<ApiRunsheet[]> } | null = null;

function loadPastRunsheets(): Promise<ApiRunsheet[]> {
  if (pastRunsheets && Date.now() - pastRunsheets.at < PAST_RUNSHEETS_TTL_MS) return pastRunsheets.promise;
  const promise = (async () => {
    const { driverId } = await requireSession();
    const list = await request<ApiRunsheet[] | null>(`api/runsheets?driverId=${encodeURIComponent(driverId)}`);
    return (Array.isArray(list) ? list : []).filter((runsheet) => text(runsheet.status) === 'COMPLETED');
  })();
  pastRunsheets = { at: Date.now(), promise };
  promise.catch(() => {
    if (pastRunsheets?.promise === promise) pastRunsheets = null;
  });
  return promise;
}

/**
 * The runs the agency closed today. The active endpoint stops listing a run
 * the moment it is closed, so without this the Current tab would only say
 * "nothing left to deliver" — it now says the run was closed, and by whom.
 * Same request as History (shared, kept a minute). A failure here is not
 * worth an error screen: the tab simply has no closed run to show.
 */
export async function getClosedRunsheetsToday(now: Date = new Date()): Promise<Runsheet[]> {
  const today = toDateKey(now);
  const past = await loadPastRunsheets().catch(() => [] as ApiRunsheet[]);
  const runs = [...past].sort(newestFirst).map(toRunsheet);
  return dayRuns([], runs.filter((run): run is Runsheet => !!run), today).closed;
}

/** Newest run first: by the day it was for, then by when it was closed. */
function newestFirst(a: ApiRunsheet, b: ApiRunsheet): number {
  const day = (r: ApiRunsheet) => text(r.scheduledDate) ?? text(r.createdAt) ?? '';
  const closed = (r: ApiRunsheet) => text(r.completedAt) ?? '';
  return day(b).localeCompare(day(a)) || closed(b).localeCompare(closed(a));
}

/**
 * Parcels on runs the agency has closed, newest run first, delivered and
 * failed ones only — a parcel left PENDING on a closed run was neither, and
 * isn't shown as either.
 */
async function pastRunsheetJobs(excludeRunsheetIds: Set<string>): Promise<Job[]> {
  const past = (await loadPastRunsheets())
    .filter((runsheet) => !excludeRunsheetIds.has(idString(runsheet.id) ?? ''))
    .sort(newestFirst);
  const jobs = past.flatMap((runsheet) => runsheetJobs(runsheet));
  return jobs.filter((job) => !isOpen(job));
}

/**
 * History: delivered and failed parcels on the driver's open runsheets
 * first, then those on runsheets the agency has closed, newest first.
 */
export async function getHistoryParcels(): Promise<Job[]> {
  const { runsheets, jobs } = await loadDriverData();
  const current = jobs.filter((job) => !isOpen(job));
  const past = await pastRunsheetJobs(new Set(runsheets.map((r) => r.id)));
  return [...current, ...past].map((job) => ({ ...copy(job), correctable: isCorrectable(job) }));
}

/**
 * A delivered or failed parcel can still be put right while its run is
 * open — the server takes parcel updates only while the run is
 * IN_PROGRESS, and stops once the agency closes it.
 */
function isCorrectable(job: Job): boolean {
  return job.server?.runsheetStatus === 'IN_PROGRESS';
}

// ── The driver's numbers ──────────────────────────────────────────────────

/**
 * Worked out on the phone from the driver's real runsheets — the server has
 * no stats endpoint for a driver.
 *
 *  - Deliveries and delivery rate: every delivered / failed parcel on every
 *    runsheet (open and closed). Rate = delivered ÷ (delivered + failed).
 *  - Cash on hand: the `price` collected on every delivered parcel on a run
 *    the agency hasn't closed yet — closing a run is when the agency takes
 *    the cash in.
 *  - Weekly cash and the "on pace" finish time: not given. Neither has an
 *    honest source on the server yet.
 */
export async function getDriverStats(): Promise<DriverStats> {
  const { runsheets, jobs } = await loadDriverData();
  const past = await pastRunsheetJobs(new Set(runsheets.map((r) => r.id)));

  const delivered = jobs.filter((job) => job.status === 'DELIVERED');
  const failed = jobs.filter((job) => job.status === 'FAILED');
  const everDelivered = delivered.length + past.filter((job) => job.status === 'DELIVERED').length;
  const everFailed = failed.length + past.filter((job) => job.status === 'FAILED').length;
  const attempted = everDelivered + everFailed;

  const cashOnHand = delivered.reduce((sum, job) => sum + (job.cashCollected ?? job.cashToCollect), 0);

  return {
    delivered: delivered.length,
    pending: jobs.length - delivered.length - failed.length,
    failed: failed.length,
    cashCollectedTotal: Math.round(cashOnHand * 1000) / 1000,
    completionPercent: jobs.length ? Math.round((delivered.length / jobs.length) * 100) : 0,
    lifetimeDeliveries: everDelivered,
    deliveryRate: attempted ? (everDelivered / attempted) * 100 : 0,
  };
}

/**
 * The plate dispatch put on the driver's runs: the current run's if it has
 * one, otherwise the most recent closed run's. Null — and not shown — when
 * no run has one.
 */
/**
 * The driver's agency contact, from data already loaded: the agency on the
 * driver's current runsheets, then on their closed ones, then the agency
 * their transfers leave from (their own; the receiving agency is someone
 * else's). The first agency with a phone, a manager's phone or an email
 * wins. Its phone is the agency's own, else its manager's; whatever is
 * still missing falls back to the placeholders. The find is saved on the phone, so
 * the login screen can offer it before anyone signs in — signed out, that
 * saved copy is all this returns, and nothing is requested.
 */
export async function getDispatchContact(): Promise<DispatchContact> {
  await device.hydrateDeviceStore();
  const session = await getSession();
  if (!session || session.mode !== 'real') return device.storedDispatchContact() ?? {};

  const withContact = (agencies: (ApiNamed | null | undefined)[]) =>
    agencies.find((agency) => text(agency?.phone) || text(agency?.managerPhone) || text(agency?.email));
  // Each source on its own: one that fails to load is skipped, not fatal.
  const current = await loadDriverData().then((data) => data.raw, () => null);
  let agency = withContact((current ?? []).map((runsheet) => runsheet.agency));
  const past = agency ? [] : await loadPastRunsheets().catch(() => null);
  if (!agency) agency = withContact([...(past ?? [])].sort(newestFirst).map((runsheet) => runsheet.agency));
  const transfers = agency
    ? []
    : await request<ApiTransfer[] | null>(`api/transfers/driver/${encodeURIComponent(session.driverId)}`).catch(() => null);
  if (!agency) agency = withContact((transfers ?? []).map((transfer) => transfer.fromAgency));

  // Nothing could be read at all (offline): keep the last good find.
  if (!agency && current === null && past === null && transfers === null) return device.storedDispatchContact() ?? {};

  const contact: DispatchContact = agency
    ? {
        // The agency's own line; its manager's when it has none.
        phone: text(agency.phone) ?? text(agency.managerPhone),
        email: text(agency.email),
        agencyName: text(agency.name),
      }
    : {};
  await device.saveDispatchContact(contact);
  return contact;
}

export async function getVehicle(): Promise<Vehicle | null> {
  const { raw } = await loadDriverData();
  const fromCurrent = raw.map((runsheet) => text(runsheet.vehiclePlate)).find(Boolean);
  if (fromCurrent) return { plate: fromCurrent };
  const past = [...(await loadPastRunsheets())].sort(newestFirst);
  const fromPast = past.map((runsheet) => text(runsheet.vehiclePlate)).find(Boolean);
  return fromPast ? { plate: fromPast } : null;
}

export async function getJobsByIds(ids: string[]): Promise<Job[]> {
  const { jobs } = await loadDriverData();
  const wanted = new Set(ids);
  return jobs.filter((job) => wanted.has(job.id)).map(copy);
}

/** Same order as the Runsheets list, so Home's "next stop" never disagrees with it. */
export async function optimizeRouteOrder(stopIds: string[]): Promise<string[]> {
  const { jobs, runsheetOf } = await loadDriverData();
  const wanted = new Set(stopIds);
  const mine = jobs.filter((job) => wanted.has(job.id));
  const open = await orderOpen(mine.filter(isOpen), runsheetOf);
  return [...open, ...mine.filter((job) => !isOpen(job))].map((job) => job.id);
}

/** The next open stop on the same runsheet, in the order the list shows. */
export async function getNextStopId(currentId: string): Promise<string | null> {
  const { runsheetOf } = await loadDriverData();
  const runsheetId = runsheetOf.get(currentId);
  if (!runsheetId) return null;
  const next = (await getActiveParcels()).find(
    (job) => job.id !== currentId && runsheetOf.get(job.id) === runsheetId
  );
  return next?.id ?? null;
}

/**
 * One parcel, by tracking number — the stop screen.
 *
 * Only the driver's own parcels, as already loaded: their open runsheets,
 * then the runsheets the agency closed. The backend asked that the app never
 * call `GET /api/parcels/tracking/{n}`; anything not found here is "not
 * found in your parcels".
 */
export async function getJobDetail(id: string): Promise<Job> {
  const own = await ownParcel(id);
  if (!own) throw new ApiError(404, `Parcel ${id} not found in the driver's parcels`);
  return copy(own);
}

// ── Pickups, transfers, returns ───────────────────────────────────────────

/** Open ones first (in the driver's saved order), then the rest as the server listed them. */
function openFirst<T extends { id: string }>(list: 'pickups' | 'transfers' | 'returns', items: T[], isOpenItem: (item: T) => boolean): T[] {
  return [...device.applyListOrder(list, items.filter(isOpenItem)), ...items.filter((item) => !isOpenItem(item))];
}

/**
 * `GET /api/pickup-requests/driver/{driverId}`, each with its parcels from
 * `GET /api/pickup-requests/{id}/parcels`. A pickup whose parcel list can't
 * be fetched still shows, with the server's estimated count.
 */
export async function getPickups(): Promise<Pickup[]> {
  const { driverId } = await requireSession();
  const [list] = await Promise.all([
    request<ApiPickup[] | null>(`api/pickup-requests/driver/${encodeURIComponent(driverId)}`),
    device.hydrateDeviceStore(),
  ]);
  const pickups = await Promise.all(
    (list ?? []).map(async (apiPickup) => {
      const parcels =
        apiPickup.id === null || apiPickup.id === undefined
          ? null
          : await request<ApiParcel[] | null>(
              `api/pickup-requests/${encodeURIComponent(String(apiPickup.id))}/parcels`
            ).catch((error) => {
              if (error instanceof ApiError && error.status === 401) throw error;
              return null;
            });
      return toPickup(apiPickup, parcels);
    })
  );
  const shown = pickups.filter((pickup): pickup is Pickup => !!pickup);
  return openFirst('pickups', shown, (pickup) => pickup.status === 'SCHEDULED');
}

/** `GET /api/transfers/driver/{driverId}`. */
export async function getTransfers(): Promise<Transfer[]> {
  const { driverId } = await requireSession();
  const [list] = await Promise.all([
    request<ApiTransfer[] | null>(`api/transfers/driver/${encodeURIComponent(driverId)}`),
    device.hydrateDeviceStore(),
  ]);
  const shown = (list ?? []).map((transfer) => toTransfer(transfer)).filter((t): t is Transfer => !!t);
  return openFirst('transfers', shown, (transfer) => transfer.status === 'IN_PROGRESS');
}

/** `GET /api/transfers/{id}` — by the server's numeric id (`transfer.server.transferId`). */
export async function getTransfer(transferId: string): Promise<Transfer> {
  const transfer = toTransfer(await request<ApiTransfer>(`api/transfers/${encodeURIComponent(transferId)}`));
  if (!transfer) throw new ApiError(404, `Transfer ${transferId} not found`);
  return transfer;
}

/** `GET /api/return-management/driver/{driverId}/assigned`. */
export async function getReturns(): Promise<Return[]> {
  const { driverId } = await requireSession();
  const [list] = await Promise.all([
    request<ApiParcel[] | null>(`api/return-management/driver/${encodeURIComponent(driverId)}/assigned`),
    device.hydrateDeviceStore(),
  ]);
  const returns = (list ?? []).map((parcel) => toReturn(parcel));
  return openFirst('returns', returns, (item) => item.status === 'PENDING_PICKUP');
}

// ── Notifications ─────────────────────────────────────────────────────────

/** The driver's alerts exactly as the server has them. */
async function fetchNotifications(): Promise<ApiNotification[]> {
  const { userId } = await requireSession();
  const list = await request<ApiNotification[] | null>(`api/notifications/user/${encodeURIComponent(userId)}`);
  return Array.isArray(list) ? list : [];
}

/**
 * `GET /api/notifications/user/{userId}` — by the USER ACCOUNT id, unlike
 * every other driver endpoint. Newest first. Alerts the driver deleted, or
 * marked unread, on this phone stay that way (see lib/deviceStore).
 */
export async function getNotifications(): Promise<Notification[]> {
  const [list] = await Promise.all([fetchNotifications(), device.hydrateDeviceStore()]);

  // Alerts about a parcel open it directly when it's on the driver's runs.
  const mentionsParcel = list.some((n) => n.referenceType?.toUpperCase().includes('PARCEL'));
  const byParcelId = new Map<string, string>();
  if (mentionsParcel) {
    const { jobs } = await loadDriverData().catch(() => ({ jobs: [] as Job[] }));
    for (const job of jobs) if (job.server?.parcelId) byParcelId.set(job.server.parcelId, job.id);
  }

  return list
    .map((n) => toNotification(n, (parcelId) => byParcelId.get(parcelId)))
    .filter((n) => !device.isNotificationHidden(n.id))
    .map((n) => (n.read && device.isMarkedUnread(n.id) ? { ...n, read: false } : n))
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
}

// Deleting and marking unread: no server endpoint, so on the phone only.

export async function markNotificationUnread(id: string): Promise<WriteResult> {
  await device.hydrateDeviceStore();
  await device.setMarkedUnread(id, true);
  return { success: true };
}

export async function deleteNotification(id: string): Promise<WriteResult> {
  await device.hydrateDeviceStore();
  await device.hideNotifications([id]);
  return { success: true };
}

/** "Clear all": hides every alert the server has now; newer ones still arrive. */
export async function deleteAllNotifications(): Promise<WriteResult> {
  try {
    const [list] = await Promise.all([fetchNotifications(), device.hydrateDeviceStore()]);
    await device.hideNotifications(list.map((n) => idString(n.id) ?? '').filter(Boolean));
    return { success: true };
  } catch (error) {
    return writeFailure(error);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Writes
// ═══════════════════════════════════════════════════════════════════════════
// Every write below:
//   - sends nothing while `EXPO_PUBLIC_API_WRITES` is off, answering
//     "Not connected to the server yet";
//   - never throws — a failure comes back as a result with a message;
//   - reports success only once the server has said yes, so a screen changes
//     only then. The cached driver data is dropped after any change, so the
//     next read shows the server's own state.

const WRITES_OFF: WriteResult = { success: false, error: 'common.writesOff' };

/** A failed request as a result a screen can show. Never throws. */
export function writeFailure(error: unknown, { notAvailableOn404 = false } = {}): WriteResult {
  if (error instanceof ApiError) {
    if (error.status === 0) return { success: false, error: 'common.networkError' };
    if (error.status === 401) return { success: false, error: 'auth.sessionExpired' };
    if (notAvailableOn404 && (error.status === 404 || error.status === 405)) {
      return { success: false, error: 'common.notAvailableYet' };
    }
    if (error.serverMessage) {
      return { success: false, error: 'common.serverRefused', errorParams: { reason: error.serverMessage } };
    }
  }
  return { success: false, error: 'common.genericError' };
}

const path = (template: TemplateStringsArray, ...ids: (string | number)[]) =>
  template.reduce((out, part, i) => out + part + (i < ids.length ? encodeURIComponent(String(ids[i])) : ''), '');

// ── Runsheet flow ─────────────────────────────────────────────────────────

/**
 * "Confirm receipt" — one tap for the driver, whatever step the run is at.
 * The server wants these in order:
 *   PENDING / VALIDATED → PUT driver-confirm, then PUT start
 *   DRIVER_CONFIRMED    → PUT start (the retry, when starting failed before)
 *   IN_PROGRESS with parcels added since → PUT confirm-new-parcels
 * The run's status is read fresh first, so a stale screen can't send the
 * wrong step. If confirming works but starting doesn't, the result says so
 * (`confirmedOnly`) and the run shows up as DRIVER_CONFIRMED, with a
 * "Start run" button.
 */
export async function confirmRunsheetReceipt(id: string): Promise<RunsheetWriteResult> {
  if (!API_WRITES) return WRITES_OFF;
  let raw: string | undefined;
  let hasNewParcels = false;
  try {
    const fresh = await request<ApiRunsheet>(path`api/runsheets/${id}`);
    raw = text(fresh?.status);
    hasNewParcels = (fresh?.items ?? []).some((item) => item.status === 'PENDING_DRIVER_CONFIRMATION');
  } catch (error) {
    return writeFailure(error);
  }

  try {
    if (raw === 'PENDING' || raw === 'VALIDATED') {
      await request(path`api/runsheets/${id}/driver-confirm`, { method: 'PUT' });
      forgetDriverData();
      try {
        await request(path`api/runsheets/${id}/start`, { method: 'PUT' });
      } catch (error) {
        const why = writeFailure(error);
        return { success: false, error: 'runsheets.confirm.startFailed', errorParams: why.errorParams, confirmedOnly: true };
      }
    } else if (raw === 'DRIVER_CONFIRMED') {
      await request(path`api/runsheets/${id}/start`, { method: 'PUT' });
    } else if (raw === 'IN_PROGRESS' && hasNewParcels) {
      await request(path`api/runsheets/${id}/confirm-new-parcels`, { method: 'PUT' });
    } else {
      return { success: false, error: 'runsheets.confirm.nothingToConfirm' };
    }
  } catch (error) {
    return writeFailure(error);
  } finally {
    forgetDriverData();
  }
  return { success: true };
}

/**
 * Refusing a run (driver-reject), or only the parcels dispatch added to it
 * later (reject-new-parcels). A reason is required. These two endpoints may
 * not exist on the live server yet: a 404 reads as "Not available yet".
 */
export async function rejectRunsheet(id: string, reason: string): Promise<WriteResult> {
  return reject(path`api/runsheets/${id}/driver-reject`, reason);
}

export async function rejectNewParcels(id: string, reason: string): Promise<WriteResult> {
  return reject(path`api/runsheets/${id}/reject-new-parcels`, reason);
}

async function reject(url: string, reason: string): Promise<WriteResult> {
  const why = reason.trim();
  if (!why) return { success: false, error: 'runsheets.refuse.reasonRequired' };
  if (!API_WRITES) return WRITES_OFF;
  try {
    await request(url, { method: 'PUT', body: { reason: why } });
  } catch (error) {
    return writeFailure(error, { notAvailableOn404: true });
  } finally {
    forgetDriverData();
  }
  return { success: true };
}

// ── Delivered / failed / correction ───────────────────────────────────────

/** One of the driver's parcels, by tracking number, as the server last described it. */
async function ownParcel(id: string): Promise<Job | undefined> {
  const { runsheets, jobs } = await loadDriverData();
  const wanted = id.trim().toUpperCase();
  const matches = (job: Job) => job.id.toUpperCase() === wanted;
  // Open runs first; then runs the agency closed, so a correction there is
  // refused as "closed" rather than "not found".
  return jobs.find(matches) ?? (await pastRunsheetJobs(new Set(runsheets.map((r) => r.id)))).find(matches);
}

/**
 * `PUT /api/runsheets/items/{itemId}/status`. CAREFUL: the RUNSHEET ITEM id
 * (the parcel's line on this run), never the parcel's own id. The server
 * takes it only while the run is IN_PROGRESS, so that's checked first.
 */
async function updateItemStatus(
  id: string,
  body: { status: 'DELIVERED' | 'FAILED' | 'PENDING'; failureReason?: string; notes?: string },
  whenNotOpen: string
): Promise<{ result: WriteResult; job?: Job }> {
  let job: Job | undefined;
  try {
    job = await ownParcel(id);
  } catch (error) {
    return { result: writeFailure(error) };
  }
  const itemId = job?.server?.itemId;
  if (!job || !itemId) return { result: { success: false, error: 'common.genericError' } };
  if (job.server?.runsheetStatus !== 'IN_PROGRESS') return { result: { success: false, error: whenNotOpen } };
  // A parcel the agency added after the start waits for the driver's OK.
  // The rest of the run stays workable.
  if (job.server?.itemStatus === 'PENDING_DRIVER_CONFIRMATION') {
    return { result: { success: false, error: 'runsheets.confirm.blockedError' } };
  }

  try {
    await request(path`api/runsheets/items/${itemId}/status`, { method: 'PUT', body });
  } catch (error) {
    return { result: writeFailure(error) };
  } finally {
    forgetDriverData();
  }
  return { result: { success: true }, job };
}

export async function confirmDelivery(id: string, cashAmount: number): Promise<ConfirmDeliveryResult> {
  if (!API_WRITES) return WRITES_OFF;
  await device.hydrateDeviceStore();
  // Same gate as everywhere: the customer has to have been called first.
  if (!device.hasCalled(id)) return { success: false, error: 'statusUpdate.callRequired' };

  const { result, job } = await updateItemStatus(id, { status: 'DELIVERED' }, 'statusUpdate.runNotStarted');
  if (!result.success || !job) return result;
  return { success: true, job: { ...copy(job), status: 'DELIVERED', cashCollected: cashAmount } };
}

/**
 * Failed delivery, with the backend's exact reason name. The GPS fix has no
 * server field: it's saved on the phone only, once the server has taken
 * the failure.
 */
export async function markDeliveryFailed(
  id: string,
  reason: DeliveryFailureReason,
  note?: string,
  location?: GeoPoint
): Promise<FailDeliveryResult> {
  if (reasonNeedsNote(reason) && !note?.trim()) return { success: false, error: 'cantDeliver.noteRequired' };
  if (!API_WRITES) return WRITES_OFF;

  // The server has no field for the call log or the GPS fix, so they ride
  // in `notes` as one short line, after the driver's own note.
  await device.hydrateDeviceStore();
  const proof = failureProofLine({ calls: device.callsFor(id), location });
  const { result, job } = await updateItemStatus(
    id,
    { status: 'FAILED', failureReason: fromFailureReason(reason), notes: failureNotes(note, proof) },
    'statusUpdate.runNotStarted'
  );
  if (!result.success || !job) return result;
  if (location) await device.saveFailureLocation(job.id, location);
  return {
    success: true,
    job: { ...copy(job), status: 'FAILED', failureReason: reason, failureNote: note, failureLocation: location },
  };
}

/** A correction: back to PENDING. Only while the agency hasn't closed the run. */
export async function reopenParcel(id: string): Promise<ConfirmDeliveryResult> {
  if (!API_WRITES) return WRITES_OFF;
  const { result, job } = await updateItemStatus(id, { status: 'PENDING' }, 'statusUpdate.runClosed');
  if (!result.success || !job) return result;
  return {
    success: true,
    job: { ...copy(job), status: 'PENDING', cashCollected: undefined, failureReason: undefined, failureNote: undefined },
  };
}

/** The photo route has no server field to send a photo to; it stays refused. */
export async function confirmDeliveryWithPhoto(
  _id: string,
  _photoUri: string,
  _cashAmount: number
): Promise<ConfirmDeliveryResult> {
  return WRITES_OFF;
}

/** The OTP route was dropped from the app; refused here so it can't reach the mock by accident. */
export async function confirmDeliveryWithOTP(
  _id: string,
  _otp: string,
  _cashAmount: number
): Promise<ConfirmDeliveryResult> {
  return WRITES_OFF;
}

// ── Pickups ───────────────────────────────────────────────────────────────

/**
 * Marks pickups collected: `PUT /api/pickup-requests/{id}/start` when one
 * hasn't been started yet, then `/complete`. One at a time; each succeeds
 * or fails on its own, so "Done all" can report "3 of 4". A pickup whose
 * start went through but whose complete didn't is left IN_PROGRESS and
 * counts as failed — trying again completes it.
 */
export async function completePickups(ids: string[]): Promise<BatchWriteResult> {
  if (!API_WRITES) return { ...WRITES_OFF, succeeded: [], failed: [...ids] };
  const succeeded: string[] = [];
  const failed: string[] = [];
  let lastFailure: WriteResult | undefined;

  let statusOf: Map<string, string | undefined>;
  try {
    const { driverId } = await requireSession();
    const list = (await request<ApiPickup[] | null>(path`api/pickup-requests/driver/${driverId}`)) ?? [];
    statusOf = new Map(list.map((pickup) => [idString(pickup.id) ?? '', text(pickup.status)]));
  } catch (error) {
    return { ...writeFailure(error), succeeded, failed: [...ids] };
  }

  for (const id of ids) {
    const status = statusOf.get(id);
    if (status === 'COMPLETED') {
      succeeded.push(id);
      continue;
    }
    try {
      if (status !== 'IN_PROGRESS') await request(path`api/pickup-requests/${id}/start`, { method: 'PUT' });
      await request(path`api/pickup-requests/${id}/complete`, { method: 'PUT' });
      succeeded.push(id);
    } catch (error) {
      failed.push(id);
      lastFailure = writeFailure(error);
    }
  }
  return { success: failed.length === 0, error: lastFailure?.error, errorParams: lastFailure?.errorParams, succeeded, failed };
}

// ── Transfers ─────────────────────────────────────────────────────────────

/**
 * The driver confirms they've loaded a transfer:
 * `POST /api/transfers/{id}/confirm-pickup?driverId=` (READY_FOR_PICKUP →
 * IN_TRANSIT), by the server's numeric id.
 */
export async function confirmTransferPickup(transfer: Transfer): Promise<WriteResult> {
  if (!API_WRITES) return WRITES_OFF;
  const transferId = transfer.server?.transferId;
  if (!transferId) return { success: false, error: 'common.genericError' };
  try {
    const { driverId } = await requireSession();
    await request(path`api/transfers/${transferId}/confirm-pickup?driverId=${driverId}`, { method: 'POST' });
  } catch (error) {
    return writeFailure(error);
  }
  return { success: true };
}

// ── Returns ───────────────────────────────────────────────────────────────

/**
 * Returns, in their two steps:
 *   TO_LOAD      → `POST /api/return-management/driver/{driverId}/confirm-loaded`
 *                  (one call loads every return waiting at the agency)
 *   TO_HAND_BACK → `POST /api/return-management/{parcelId}/confirm-delivered?driverId=`
 *                  (one per parcel, handed to its sender)
 * Stages are read fresh from the server first.
 */
export async function confirmReturns(ids: string[]): Promise<BatchWriteResult> {
  if (!API_WRITES) return { ...WRITES_OFF, succeeded: [], failed: [...ids] };
  const succeeded: string[] = [];
  const failed: string[] = [];
  let lastFailure: WriteResult | undefined;

  let driverId: string;
  let byId: Map<string, Return>;
  try {
    driverId = (await requireSession()).driverId;
    const list = (await request<ApiParcel[] | null>(path`api/return-management/driver/${driverId}/assigned`)) ?? [];
    byId = new Map(list.map((parcel) => toReturn(parcel)).map((item) => [item.id, item]));
  } catch (error) {
    return { ...writeFailure(error), succeeded, failed: [...ids] };
  }

  const toLoad = ids.filter((id) => byId.get(id)?.stage === 'TO_LOAD');
  const toHandBack = ids.filter((id) => byId.get(id)?.stage === 'TO_HAND_BACK');
  failed.push(...ids.filter((id) => !toLoad.includes(id) && !toHandBack.includes(id)));

  if (toLoad.length > 0) {
    try {
      const loaded = await request<ApiParcel[] | null>(path`api/return-management/driver/${driverId}/confirm-loaded`, {
        method: 'POST',
      });
      // The server answers with the parcels it loaded; without a list, the call itself is the answer.
      const loadedIds = Array.isArray(loaded) ? new Set(loaded.map((parcel) => toReturn(parcel).id)) : null;
      for (const id of toLoad) (loadedIds === null || loadedIds.has(id) ? succeeded : failed).push(id);
    } catch (error) {
      failed.push(...toLoad);
      lastFailure = writeFailure(error);
    }
  }

  for (const id of toHandBack) {
    const parcelId = byId.get(id)?.server?.parcelId;
    try {
      if (!parcelId) throw new ApiError(0, 'no parcel id');
      await request(path`api/return-management/${parcelId}/confirm-delivered?driverId=${driverId}`, { method: 'POST' });
      succeeded.push(id);
    } catch (error) {
      failed.push(id);
      lastFailure = writeFailure(error);
    }
  }
  return { success: failed.length === 0, error: lastFailure?.error, errorParams: lastFailure?.errorParams, succeeded, failed };
}

// ── Notifications ─────────────────────────────────────────────────────────

/**
 * `PUT /api/notifications/{id}/read`. An alert the driver only marked
 * unread on this phone is still read on the server, so marking it read
 * again just drops the local mark — no request, and it works with writes
 * off too.
 */
export async function markNotificationRead(id: string): Promise<WriteResult> {
  await device.hydrateDeviceStore();
  if (device.isMarkedUnread(id)) {
    const serverHasItRead = await fetchNotifications()
      .then((list) => list.find((n) => idString(n.id) === id)?.isRead === true)
      .catch(() => false);
    if (serverHasItRead) {
      await device.setMarkedUnread(id, false);
      return { success: true };
    }
  }
  if (!API_WRITES) return WRITES_OFF;
  try {
    await request(path`api/notifications/${id}/read`, { method: 'PUT' });
  } catch (error) {
    return writeFailure(error);
  }
  await device.setMarkedUnread(id, false);
  return { success: true };
}

/** `PUT /api/notifications/user/{userId}/read-all` — the USER ACCOUNT id, like the list. */
export async function markAllNotificationsRead(): Promise<WriteResult> {
  if (!API_WRITES) return WRITES_OFF;
  try {
    const { userId } = await requireSession();
    await request(path`api/notifications/user/${userId}/read-all`, { method: 'PUT' });
  } catch (error) {
    return writeFailure(error);
  }
  await device.hydrateDeviceStore();
  await device.clearMarkedUnread();
  return { success: true };
}

/**
 * The scanner, on real data: a lookup in the driver's own parcels — the same
 * local search as the Search screen, exact tracking numbers only, no server
 * lookup. A find is only a find: it changes nothing, and says so. A list
 * that fails to load is skipped rather than failing the whole scan.
 */
export async function confirmScan(code: string): Promise<ScanResult> {
  const wanted = code.trim().toUpperCase();
  if (!wanted) return { success: false, error: 'scanner.errors.notRecognized' };

  const [driverData, history, pickups, transfers, returns] = await Promise.allSettled([
    loadDriverData(),
    getHistoryParcels(),
    getPickups(),
    getTransfers(),
    getReturns(),
  ]);
  const value = <T,>(result: PromiseSettledResult<T>) => (result.status === 'fulfilled' ? result.value : null);
  const hit = findExact(wanted, {
    active: value(driverData)?.jobs.filter(isOpen),
    history: value(history),
    pickups: value(pickups),
    transfers: value(transfers),
    returns: value(returns),
  })[0];
  if (!hit) return { success: false, error: 'scanner.errors.notRecognized' };

  const target = hit.target;
  const kind: ScanResult['kind'] =
    hit.source === 'pickup' ? 'pickup' : hit.source === 'transfer' ? 'transfer' : hit.source === 'return' ? 'return' : 'job';
  const id = target.screen === 'job' ? target.jobId : (target.focusId ?? hit.trackingNumber);
  return { success: true, kind, id, label: hit.name ?? hit.context ?? hit.trackingNumber, checkedOnly: true };
}

// ── Phone-only state over real parcels ────────────────────────────────────
// No server write: the call log and the driver's order live on the phone
// (lib/deviceStore). These real versions only exist because the mock ones
// look parcels up in the mock data.

/** Logs a call to this parcel's customer. The delivery gate reads the same log. */
export async function logCallAttempt(id: string): Promise<Job> {
  await device.hydrateDeviceStore();
  const calls = await device.recordCall(id);
  forgetDriverData();
  const job = await getJobDetail(id);
  return { ...job, callAttempts: calls.length, lastCallAt: calls.at(-1) };
}

/** The driver dragged their stops into a new order: saved per runsheet, on the phone. */
export async function setStopOrder(orderedIds: string[]): Promise<void> {
  const { runsheetOf } = await loadDriverData();
  await device.saveStopOrder(orderedIds, (id) => runsheetOf.get(id));
}
