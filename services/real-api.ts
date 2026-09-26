/**
 * The real Jibex backend (https://jibex.cloud), behind the same function
 * names and result shapes as `mock-api.ts`, so screens don't care which one
 * answers. `services/api.ts` picks per function.
 *
 * Connected so far (read-only apart from login):
 *   - login, and the signed-in driver's details that come with it
 *   - GET /api/runsheets/driver/{driverId}/active  → the driver's runsheets
 *   - GET /api/runsheets/{id}                      → one runsheet with its items
 *   - GET /api/parcels/tracking/{trackingNumber}   → search (see getJobDetail)
 *   - GET /api/pickup-requests/driver/{driverId}   → pickups
 *   - GET /api/pickup-requests/{id}/parcels        → a pickup's parcels
 *   - GET /api/transfers/driver/{driverId}         → transfers
 *   - GET /api/transfers/{id}                      → one transfer
 *   - GET /api/return-management/driver/{driverId}/assigned → returns
 *   - GET /api/notifications/user/{userId}         → notifications (USER id)
 * Everything that writes to the server still answers from the mock.
 *
 * Three small layers, top to bottom:
 *   1. HTTP client  — base URL, the Bearer token, errors, and 401 → sign out
 *   2. Field mapper — the server's field names onto our types
 *   3. Enum mapper  — the server's status / reason values onto ours, both ways
 */

import { API_BASE_URL, API_TIMEOUT_MS } from '../constants/backend';
import * as device from '../lib/deviceStore';
import { localeTag } from '../lib/date';
import { FALLBACK_ORIGIN } from '../lib/geo';
import { i18next } from '../lib/i18n';
import { nearestNeighborOrder } from '../lib/route';
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
  driver?: { id?: number | string | null; fullName?: string | null } | null;
  agency?: { id?: number | string | null; name?: string | null } | null;
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
 * Cash: `amountToCollect` becomes what the driver collects. The server also
 * sends `price` (in every parcel seen so far, `amountToCollect` +
 * `deliveryFee`), which is what the Android app shows. Both are kept, and
 * logged in development, until the backend team says which is right.
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
    cashToCollect: amountToCollect ?? 0,
    cashCollected: status === 'DELIVERED' ? amountToCollect : undefined,
    location: point(parcel.recipientLat, parcel.recipientLng),
    failureReason: status === 'FAILED' ? failureReason : undefined,
    failureNote: text(parcel.failureNotes),
    proofPhotoUri: text(parcel.deliveryPhotoUrl),
    callAttempts: calls.length,
    lastCallAt: calls.at(-1),
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
  return [...(runsheet.items ?? [])]
    .map((item, index) => ({ item, index }))
    .sort(
      (a, b) =>
        (num(a.item.sequenceOrder) ?? Number.MAX_SAFE_INTEGER) -
          (num(b.item.sequenceOrder) ?? Number.MAX_SAFE_INTEGER) || a.index - b.index
    )
    .filter(({ item }) => item.parcel)
    .map(({ item }) => toJob(item.parcel!, item, runsheetId));
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
  const newParcelsToConfirm = items.some((item) => item.status === 'PENDING_DRIVER_CONFIRMATION');

  return {
    id: idString(runsheet.id) ?? '',
    code: text(runsheet.code),
    zone: zoneOf(runsheet),
    agency: text(runsheet.agency?.name) ?? '',
    status,
    stopCount: jobs.length || (num(runsheet.totalParcels) ?? 0),
    deliveredCount: delivered,
    needsConfirmation: status === 'A_CONFIRMER' || newParcelsToConfirm,
    completionPercent: jobs.length ? Math.round((delivered / jobs.length) * 100) : 0,
    stopIds: jobs.map((job) => job.id),
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
  sender?: { id?: number | string | null; name?: string | null; senderName?: string | null; phone?: string | null } | null;
}

interface ApiNamed {
  id?: number | string | null;
  name?: string | null;
  city?: string | null;
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
 * A pickup request onto ours, or null for a cancelled one. Cash on its
 * parcels follows the same rule as runsheets (`amountToCollect`).
 */
export function toPickup(apiPickup: ApiPickup, apiParcels?: ApiParcel[] | null): Pickup | null {
  const raw = text(apiPickup.status);
  if (raw === 'CANCELLED') return null;
  const parcels = (apiParcels ?? []).map((parcel) => ({
    trackingNumber: text(parcel.trackingNumber) ?? `P-${idString(parcel.id) ?? '?'}`,
    contactName: text(parcel.recipientName) ?? '—',
    address: [text(parcel.recipientAddress), text(parcel.recipientCity)].filter(Boolean).join(', '),
    codAmount: num(parcel.amountToCollect) ?? 0,
  }));
  const scheduledAt = text(apiPickup.scheduledAt) ?? text(apiPickup.requestedDate) ?? text(apiPickup.createdAt);
  return {
    id: idString(apiPickup.id) ?? '',
    businessName: text(apiPickup.sender?.name) ?? text(apiPickup.sender?.senderName) ?? text(apiPickup.contactPerson) ?? '—',
    address: [text(apiPickup.pickupAddress), text(apiPickup.pickupCity)].filter(Boolean).join(', '),
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
    originAgency: text(from?.name) ?? '—',
    destinationAgency: text(apiTransfer.toAgency?.name) ?? '—',
    parcelCount: parcels.length,
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
  switch (status) {
    case 'DELIVERED':
    case 'LIVRE_PAYE':
      return 'DELIVERED';
    case 'RTN_DEPOT':
    case 'RETOUR_DEFINITIF':
    case 'RETOUR_CLIENT_AGENCE':
    case 'RETOUR_A_CHARGER':
    case 'EN_TRANSIT_RETOUR':
    case 'RETOUR_EXPEDITEUR':
    case 'RETOUR_RECU':
    case 'RETURNED':
    case 'CANCELLED':
    case 'LOST':
      return 'FAILED';
    case 'EN_COURS':
    case 'OUT_FOR_DELIVERY':
    case 'IN_TRANSIT':
    case 'EN_TRANSIT_AGENCE':
    case 'AU_DEPOT':
    case 'AU_DEPOT_RELAIS':
    case 'AU_DEPOT_DESTINATION':
      return 'IN_TRANSIT';
    case 'PENDING':
    case 'A_ENLEVER':
    case 'PICKUP':
    case 'CREATED':
    case 'PICKED_UP':
    case 'SCANNED':
    case 'A_VERIFIER':
      return 'PENDING';
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
  await clearSession();
}

// ── The driver's runsheets ────────────────────────────────────────────────

interface DriverData {
  runsheets: Runsheet[];
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
}

async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session || session.mode !== 'real') {
    await expireSession();
    throw new ApiError(401, 'not signed in');
  }
  return session;
}

/** Logs both cash figures once per parcel per launch, in development only. */
const cashLogged = new Set<string>();
function logCash(jobs: Job[]) {
  if (!__DEV__) return;
  for (const job of jobs) {
    if (cashLogged.has(job.id)) continue;
    cashLogged.add(job.id);
    const info = job.server;
    console.log(
      `[cash] ${job.id}: amountToCollect=${info?.amountToCollect ?? '-'} price=${info?.price ?? '-'} ` +
        `deliveryFee=${info?.deliveryFee ?? '-'} → collecting ${job.cashToCollect}`
    );
  }
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
  const jobs: Job[] = [];
  const runsheetOf = new Map<string, string>();
  for (const apiRunsheet of full) {
    const runsheet = toRunsheet(apiRunsheet);
    if (!runsheet) continue;
    runsheets.push(runsheet);
    for (const job of runsheetJobs(apiRunsheet)) {
      if (runsheetOf.has(job.id)) continue;
      runsheetOf.set(job.id, runsheet.id);
      jobs.push(job);
    }
  }
  logCash(jobs);
  return { runsheets, jobs, runsheetOf };
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
 * The order the driver works open stops in: nearest-first when it's on and
 * the stops have coordinates, otherwise the driver's own drag order laid over
 * dispatch's sequence (stops they haven't placed keep dispatch's order).
 */
function orderOpen(jobs: Job[], runsheetOf: Map<string, string>): Job[] {
  const byRunsheet = (id: string) => runsheetOf.get(id);
  if (device.isNearestFirst() && jobs.some((job) => job.location)) {
    return nearestNeighborOrder(jobs, FALLBACK_ORIGIN);
  }
  return device.applyStopOrder(jobs, byRunsheet);
}

/** `GET /api/runsheets/driver/{driverId}/active`, drafts and cancelled runs left out. */
export async function getRunsheets(): Promise<Runsheet[]> {
  const { runsheets } = await loadDriverData();
  return runsheets.map((runsheet) => ({ ...runsheet, stopIds: [...runsheet.stopIds] }));
}

/** `GET /api/runsheets/{id}`. */
export async function getRunsheet(id: string): Promise<Runsheet> {
  const apiRunsheet = await request<ApiRunsheet>(`api/runsheets/${encodeURIComponent(id)}`);
  const runsheet = toRunsheet(apiRunsheet);
  if (!runsheet) throw new ApiError(404, `Runsheet ${id} not found`);
  return runsheet;
}

/** A runsheet's own parcels, in dispatch's stop order. */
export async function getRunsheetJobs(id: string): Promise<Job[]> {
  const apiRunsheet = await request<ApiRunsheet>(`api/runsheets/${encodeURIComponent(id)}`);
  await device.hydrateDeviceStore();
  const jobs = runsheetJobs(apiRunsheet);
  logCash(jobs);
  return jobs;
}

/**
 * Every parcel still to deliver, across the driver's runsheets. Delivered and
 * failed ones drop out (they're history). Parcels on a run the driver hasn't
 * signed for yet sit at the end, locked.
 */
export async function getActiveParcels(): Promise<Job[]> {
  const { runsheets, jobs, runsheetOf } = await loadDriverData();
  const locked = new Set(runsheets.filter((r) => r.needsConfirmation).map((r) => r.id));
  const open = jobs.filter(isOpen);
  const workable = open.filter((job) => !locked.has(runsheetOf.get(job.id) ?? ''));
  const blocked = open.filter((job) => locked.has(runsheetOf.get(job.id) ?? ''));
  return [...orderOpen(workable, runsheetOf), ...blocked].map(copy);
}

/**
 * Delivered and failed parcels on the driver's current runsheets. (Finished
 * runsheets aren't fetched in this phase, so older history isn't here yet.)
 */
export async function getHistoryParcels(): Promise<Job[]> {
  const { jobs } = await loadDriverData();
  return jobs.filter((job) => !isOpen(job)).map(copy);
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
  const open = orderOpen(mine.filter(isOpen), runsheetOf);
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
 * One parcel, by tracking number — the stop screen and the search box.
 *
 * The driver's own runsheets are checked first: that's where nearly every
 * lookup lands, and it needs no extra request. Anything else goes to
 * `GET /api/parcels/tracking/{n}`, which currently answers 403 for driver
 * accounts; until the backend opens it to drivers, that reads as "not found".
 */
export async function getJobDetail(id: string): Promise<Job> {
  const { jobs } = await loadDriverData();
  const wanted = id.trim().toUpperCase();
  const own = jobs.find((job) => job.id.toUpperCase() === wanted);
  if (own) return copy(own);

  try {
    const parcel = await request<ApiParcel>(`api/parcels/tracking/${encodeURIComponent(id.trim())}`);
    const job = toJob(parcel);
    logCash([job]);
    return job;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
      throw new ApiError(404, `Parcel ${id} not found`);
    }
    throw error;
  }
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

/**
 * `GET /api/notifications/user/{userId}` — by the USER ACCOUNT id, unlike
 * every other driver endpoint. Newest first.
 */
export async function getNotifications(): Promise<Notification[]> {
  const { userId } = await requireSession();
  const list = (await request<ApiNotification[] | null>(`api/notifications/user/${encodeURIComponent(userId)}`)) ?? [];

  // Alerts about a parcel open it directly when it's on the driver's runs.
  const mentionsParcel = list.some((n) => n.referenceType?.toUpperCase().includes('PARCEL'));
  const byParcelId = new Map<string, string>();
  if (mentionsParcel) {
    const { jobs } = await loadDriverData().catch(() => ({ jobs: [] as Job[] }));
    for (const job of jobs) if (job.server?.parcelId) byParcelId.set(job.server.parcelId, job.id);
  }

  return list
    .map((n) => toNotification(n, (parcelId) => byParcelId.get(parcelId)))
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
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
