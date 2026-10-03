import { addDays, toCompactDateKey, toDateKey } from '../lib/date';
import { formatCurrency } from '../lib/currency';
import * as device from '../lib/deviceStore';
import { nearestFirstByArea, nearestNeighborOrder } from '../lib/route';
import { driverPosition } from '../lib/driverPosition';
import { reasonNeedsNote } from '../lib/failureReasons';
import { clearSession, saveSession } from '../lib/session';
import { formatPickupId, formatRunsheetId, generateTrackingId } from '../lib/ids';
import type {
  BatchWriteResult,
  DeliveryFailureReason,
  DispatchContact,
  DriverStats,
  GeoPoint,
  Job,
  Notification,
  Pickup,
  PickupParcel,
  Return,
  Runsheet,
  Transfer,
  User,
  Vehicle,
  WriteResult,
} from '../types';

/**
 * In-memory stand-in for the real backend. Every exported function has the
 * same name, signature, and return shape it will have once it calls a real
 * `fetch()` — swapping the body out for a real request shouldn't require
 * touching any screen that imports from here.
 */

// ---------------------------------------------------------------------------
// Async boundary
// ---------------------------------------------------------------------------

/**
 * Resolves on the microtask queue — no artificial latency.
 *
 * This used to sleep 300-600ms per call to imitate a network, which is a fine
 * way to check your skeletons and a terrible way to use the app: a single
 * screen makes several calls, so the fake latency stacked into seconds of
 * staring at placeholders. Kept as a function (rather than deleted from ~40
 * call sites) so these stay `async` for the day they hit a real API.
 */
/**
 * Every call waits for the phone's own saved state (stop order, call log) to
 * load once, so nothing is answered from defaults and then contradicted a
 * moment later — the first list after a restart already has the driver's
 * order and their calls in it.
 */
let deviceReady: Promise<void> | null = null;

function delay<T>(value: T): Promise<T> {
  deviceReady ??= device.hydrateDeviceStore().then(syncCallsFromDevice);
  return deviceReady.then(() => value);
}

// ---------------------------------------------------------------------------
// Time helpers — anchored to "now" so the mock data reads as "today" and
// "yesterday" whenever the app actually runs, not a date baked in at authoring time.
// ---------------------------------------------------------------------------

function todayAt(hours: number, minutes: number): string {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

function daysAgoAt(days: number, hours: number, minutes: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

// ---------------------------------------------------------------------------
// Route geometry — nearest-neighbor ordering over real (approximate) Sousse/
// Sfax/Monastir/Tunis coordinates. A real backend would run a proper routing
// engine (Mapbox/Google Directions); this is the same shape of answer
// (an ordered stop list) computed with a simple greedy heuristic instead.
// ---------------------------------------------------------------------------

/** Driver's approximate start point — Sousse/Sahloul depot. */
const DEPOT: GeoPoint = { lat: 35.848, lng: 10.5975 };

// ---------------------------------------------------------------------------
// Driver-owned order — stop sequence for Runsheets/Home, and one manual sort
// per list for Pickups/Transfers/Returns. `nearestFirst` only applies to
// stops (the only list with real GPS coordinates to sort by). None of it
// exists on the server, so it's kept on the phone (`lib/deviceStore`) and
// survives the app being closed.
// ---------------------------------------------------------------------------

/** Which runsheet a stop belongs to — how the saved order is filed. */
function runsheetOf(stopId: string): string | undefined {
  return mockRunsheets.find((r) => r.stopIds.includes(stopId))?.id;
}

export async function getNearestFirst(): Promise<boolean> {
  await delay(undefined);
  return device.isNearestFirst();
}

/** Toggled on, the driver's manual stop order is kept but stops driving anything — flip it back off to resume it. */
export async function setNearestFirst(enabled: boolean): Promise<void> {
  await delay(undefined);
  await device.setNearestFirst(enabled);
}

/**
 * Same rule as the real server: "Nearest first" sorts by distance from the
 * driver (to each stop's own coordinates — mock parcels have them — else its
 * governorate), and falls back to the incoming order with no position.
 * Off, the driver's saved drag order.
 */
async function orderOpen(jobs: Job[]): Promise<Job[]> {
  if (device.isNearestFirst()) {
    const { coords } = await driverPosition();
    return coords ? nearestFirstByArea(jobs, coords) : jobs;
  }
  return device.applyStopOrder(jobs, runsheetOf);
}

/** A driver dragging their own order is a deliberate override — it turns nearest-first off rather than fighting it. */
export async function setStopOrder(orderedIds: string[]): Promise<void> {
  await delay(undefined);
  await device.saveStopOrder(orderedIds, runsheetOf);
}

export async function setPickupOrder(orderedIds: string[]): Promise<void> {
  await delay(undefined);
  await device.saveListOrder('pickups', orderedIds);
}

export async function setTransferOrder(orderedIds: string[]): Promise<void> {
  await delay(undefined);
  await device.saveListOrder('transfers', orderedIds);
}

export async function setReturnOrder(orderedIds: string[]): Promise<void> {
  await delay(undefined);
  await device.saveListOrder('returns', orderedIds);
}

/** The seed parcels' call counts come from the phone's saved call log. */
function syncCallsFromDevice() {
  for (const job of mockJobs) {
    const calls = device.callsFor(job.id);
    job.callAttempts = calls.length;
    job.lastCallAt = calls.at(-1);
  }
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const today = new Date();
const yesterday = addDays(today, -1);

/** Not part of the public Job shape — a real API wouldn't hand the driver
 *  app the correct code either; it's only known to confirmDeliveryWithOTP. */
const otpByJobId: Record<string, string> = {
  'TRK-5DF3697E': '4187',
  'TRK-A12BC034': '2093',
  'TRK-77F1E9AB': '5521',
  'TRK-3C4D8F21': '7734',
};

const mockJobs: Job[] = [
  {
    id: 'TRK-5DF3697E',
    customerName: 'Amine Ben Salah',
    customerPhone: '+216 20 456 789',
    address: 'Rue de la Liberté, Sahloul, Sousse',
    packageInfo: { count: 1, weightKg: 2.4, fragile: true, note: 'Leave with concierge if not home' },
    status: 'IN_TRANSIT',
    cashToCollect: 42.0,
    location: { lat: 35.8465, lng: 10.6015 },
    callAttempts: 0,
  },
  {
    id: 'TRK-A12BC034',
    customerName: 'Karim Mejri',
    customerPhone: '+216 22 314 908',
    address: 'Avenue Farhat Hached, Sfax',
    packageInfo: { count: 2, weightKg: 5.1, fragile: false },
    status: 'PENDING',
    cashToCollect: 28.5,
    location: { lat: 34.7398, lng: 10.76 },
    callAttempts: 0,
    // Came back to the depot once already: this is its second attempt.
    deliveryAttempts: 1,
  },
  {
    id: 'TRK-77F1E9AB',
    customerName: 'Sarra Gharbi',
    customerPhone: '+216 26 771 244',
    address: 'Rue Ibn Khaldoun, Monastir',
    packageInfo: { count: 1, weightKg: 1.2, fragile: false },
    status: 'PENDING',
    cashToCollect: 65.0,
    location: { lat: 35.7643, lng: 10.8113 },
    callAttempts: 0,
    // Failed twice: the third and last attempt the agency allows.
    deliveryAttempts: 2,
  },
  {
    id: 'TRK-3C4D8F21',
    customerName: 'Nizar Guesmi',
    customerPhone: '+216 24 590 118',
    address: 'Rue de Marseille, Sfax',
    packageInfo: { count: 3, weightKg: 8.0, fragile: false },
    status: 'PENDING',
    cashToCollect: 15.0,
    location: { lat: 34.735, lng: 10.765 },
    callAttempts: 0,
  },
  {
    id: 'TRK-9E0A2B6D',
    customerName: 'Rania Cherif',
    customerPhone: '+216 27 683 052',
    address: 'Avenue de la République, Monastir',
    packageInfo: { count: 1, weightKg: 0.8, fragile: true, note: 'Ring twice' },
    status: 'PENDING',
    cashToCollect: 22.0,
    location: { lat: 35.77, lng: 10.82 },
    callAttempts: 0,
    // An exchange: the driver takes an article back for the sender.
    exchange: true,
  },
  {
    id: 'TRK-B6F31C08',
    customerName: 'Walid Ammar',
    customerPhone: '+216 21 908 366',
    address: 'Zone Industrielle, Sfax',
    packageInfo: { count: 4, weightKg: 12.5, fragile: false },
    status: 'FAILED',
    failureReason: 'WRONG_ADDRESS',
    cashToCollect: 0,
    location: { lat: 34.72, lng: 10.69 },
    callAttempts: 0,
  },
  {
    id: 'TRK-1F4A7D93',
    customerName: 'Ines Trabelsi',
    customerPhone: '+216 25 447 610',
    address: 'Boulevard 14 Janvier, Sousse',
    packageInfo: { count: 1, weightKg: 3.0, fragile: false },
    status: 'DELIVERED',
    cashToCollect: 55.0,
    cashCollected: 55.0,
    location: { lat: 35.8256, lng: 10.6084 },
    callAttempts: 0,
  },
  {
    id: 'TRK-6C2E9F45',
    customerName: 'Yassine Trabelsi',
    customerPhone: '+216 29 152 837',
    address: 'Avenue Habib Bourguiba, Tunis',
    packageInfo: { count: 1, weightKg: 1.5, fragile: false },
    status: 'DELIVERED',
    cashToCollect: 30.0,
    cashCollected: 30.0,
    location: { lat: 36.7992, lng: 10.1817 },
    callAttempts: 0,
  },
  {
    id: 'TRK-7A2E4F19',
    customerName: 'Amel Trabelsi',
    customerPhone: '+216 23 604 771',
    address: 'Avenue de Gabès, Sfax',
    packageInfo: { count: 1, weightKg: 1.8, fragile: false },
    status: 'PENDING',
    cashToCollect: 19.0,
    location: { lat: 34.728, lng: 10.702 },
    callAttempts: 0,
  },
  /** Yesterday's already-wrapped-up stops — feed the one historical (VALIDE) runsheet. */
  {
    id: 'TRK-99F0C3E2',
    customerName: 'Sami Belhaj',
    customerPhone: '+216 28 340 662',
    address: 'Rue de la République, Sousse',
    packageInfo: { count: 1, weightKg: 2.0, fragile: false },
    status: 'DELIVERED',
    cashToCollect: 35.0,
    cashCollected: 35.0,
    location: { lat: 35.833, lng: 10.62 },
    callAttempts: 0,
  },
  {
    id: 'TRK-88D4B716',
    customerName: 'Nadia Ferjani',
    customerPhone: '+216 22 917 384',
    address: 'Avenue Léopold Senghor, Sousse',
    packageInfo: { count: 2, weightKg: 4.2, fragile: false },
    status: 'DELIVERED',
    cashToCollect: 47.5,
    cashCollected: 47.5,
    location: { lat: 35.845, lng: 10.63 },
    callAttempts: 0,
  },
];

/** Raw seed shape — `stopCount`/`deliveredCount`/`completionPercent`/`needsConfirmation` are never trusted from here, always recomputed live from `mockJobs` (see `toRunsheet`) so they can't drift out of sync as job statuses change. */
type RunsheetSeed = Omit<
  Runsheet,
  'stopCount' | 'deliveredCount' | 'completionPercent' | 'needsConfirmation'
> & {
  /** Parcel count the driver last attested to. Null until first confirmation; a mismatch against the live count means dispatch added or pulled parcels and the driver must re-confirm. */
  confirmedStopCount: number | null;
};

const mockRunsheets: RunsheetSeed[] = [
  {
    id: formatRunsheetId(today, 1),
    scheduledDate: toDateKey(today),
    zone: 'Sousse, Sahloul',
    agency: 'Agence Sousse',
    status: 'EN_COURS',
    // Confirmed at 4 this morning; dispatch added a 5th parcel since, so the
    // driver is asked to re-confirm the new count.
    confirmedStopCount: 4,
    stopIds: ['TRK-5DF3697E', 'TRK-A12BC034', 'TRK-77F1E9AB', 'TRK-1F4A7D93', 'TRK-B6F31C08'],
  },
  {
    id: formatRunsheetId(today, 2),
    scheduledDate: toDateKey(today),
    zone: 'Sfax, Zone Industrielle',
    agency: 'Agence Sousse',
    status: 'A_CONFIRMER',
    confirmedStopCount: null,
    stopIds: ['TRK-3C4D8F21', 'TRK-7A2E4F19'],
  },
  {
    id: formatRunsheetId(today, 3),
    scheduledDate: toDateKey(today),
    zone: 'Monastir',
    agency: 'Agence Sousse',
    status: 'EN_COURS',
    confirmedStopCount: 2,
    stopIds: ['TRK-9E0A2B6D', 'TRK-6C2E9F45'],
  },
  {
    id: formatRunsheetId(yesterday, 1),
    scheduledDate: toDateKey(yesterday),
    zone: 'Sousse, Centre Ville',
    agency: 'Agence Sousse',
    status: 'VALIDE',
    confirmedStopCount: 2,
    stopIds: ['TRK-99F0C3E2', 'TRK-88D4B716'],
  },
];

/** Fills in the live-computed fields a `RunsheetSeed` doesn't store. */
function toRunsheet(seed: RunsheetSeed): Runsheet {
  const jobs = seed.stopIds
    .map((id) => mockJobs.find((j) => j.id === id))
    .filter((j): j is Job => !!j);
  const stopCount = jobs.length;
  const deliveredCount = jobs.filter((j) => j.status === 'DELIVERED').length;
  const completionPercent = stopCount === 0 ? 0 : Math.round((deliveredCount / stopCount) * 100);
  // Never confirmed, or confirmed against a count that has since changed —
  // either way the driver has to attest to what's actually in the van now.
  const needsConfirmation =
    seed.status === 'A_CONFIRMER' || seed.confirmedStopCount !== stopCount;

  return {
    ...seed,
    stopIds: [...seed.stopIds],
    stopCount,
    deliveredCount,
    completionPercent,
    needsConfirmation,
  };
}

/** Recipient names cycled across generated parcels — not tied to any Job, purely mock display data. */
const PARCEL_CONTACTS = [
  'Sami Klibi',
  'Nadia Ferjani',
  'Hatem Sassi',
  'Emna Rekik',
  'Bilel Chtioui',
  'Rim Abidi',
];

function generateParcels(count: number, address: string): PickupParcel[] {
  return Array.from({ length: count }, (_, i) => ({
    trackingNumber: generateTrackingId(),
    contactName: PARCEL_CONTACTS[i % PARCEL_CONTACTS.length],
    address,
    codAmount: Math.round((15 + ((i * 11) % 60)) * 100) / 100,
  }));
}

const mockPickups: Pickup[] = [
  {
    id: formatPickupId('3', today, 1),
    businessName: 'Manufacture Tounsi Textile',
    address: 'Zone Industrielle, Sfax',
    status: 'SCHEDULED',
    requestedByDate: todayAt(0, 0),
    timeWindow: '11:30–12:00',
    packageCount: 12,
    contactName: 'Youssef Mansour',
    contactPhone: '+216 20 774 512',
    parcels: generateParcels(12, 'Zone Industrielle, Sfax'),
  },
  {
    id: formatPickupId('3', today, 2),
    businessName: 'Librairie El Kitab',
    address: 'Avenue Habib Bourguiba, Sousse',
    status: 'SCHEDULED',
    requestedByDate: todayAt(0, 0),
    timeWindow: '2:00–2:30 PM',
    packageCount: 4,
    contactName: 'Leila Haddad',
    contactPhone: '+216 22 638 904',
    parcels: generateParcels(4, 'Avenue Habib Bourguiba, Sousse'),
  },
  {
    id: formatPickupId('3', today, 3),
    businessName: 'Pharmacie El Amen',
    address: 'Rue de la Liberté, Sousse',
    status: 'SCHEDULED',
    requestedByDate: todayAt(0, 0),
    timeWindow: '3:30–4:00 PM',
    packageCount: 2,
    contactName: 'Mehdi Zouari',
    contactPhone: '+216 26 190 447',
    parcels: generateParcels(2, 'Rue de la Liberté, Sousse'),
  },
  {
    id: formatPickupId('3', today, 4),
    businessName: 'Superette Boubaker',
    address: 'Avenue Farhat Hached, Sfax',
    status: 'COMPLETED',
    requestedByDate: todayAt(0, 0),
    timeWindow: '9:00–9:30 AM',
    packageCount: 6,
    contactName: 'Ahmed Boubaker',
    contactPhone: '+216 24 883 021',
    parcels: generateParcels(6, 'Avenue Farhat Hached, Sfax'),
  },
  {
    id: formatPickupId('3', yesterday, 1),
    businessName: 'Atelier Ben Youssef',
    address: 'Rue Ibn Khaldoun, Monastir',
    status: 'COMPLETED',
    requestedByDate: daysAgoAt(1, 0, 0),
    timeWindow: '8:00–8:30 AM',
    packageCount: 3,
    contactName: 'Fares Ben Youssef',
    contactPhone: '+216 27 509 366',
    parcels: generateParcels(3, 'Rue Ibn Khaldoun, Monastir'),
  },
  {
    id: formatPickupId('3', today, 5),
    businessName: 'Boutique Ines',
    address: 'Boulevard 14 Janvier, Sousse',
    status: 'SCHEDULED',
    requestedByDate: todayAt(0, 0),
    timeWindow: '5:00–5:30 PM',
    packageCount: 1,
    contactName: 'Ines Karray',
    contactPhone: '+216 21 265 798',
    parcels: generateParcels(1, 'Boulevard 14 Janvier, Sousse'),
  },
];

const mockTransfers: Transfer[] = [
  {
    // Validated by the agency and waiting for this driver: each parcel is
    // scanned before "Confirmer la prise en charge".
    id: 'TR-9204',
    status: 'IN_PROGRESS',
    awaitingPickupConfirmation: true,
    originAgency: 'Agence Sousse',
    destinationAgency: 'Agence Sfax',
    parcelCount: 5,
    parcelTrackingNumbers: ['TRK-51B62DC7', 'TRK-699F0F1D', 'TRK-C9166BCA', 'TRK-6107B96B', 'TRK-561D8F37'],
    location: 'Dépôt Sahloul',
    scheduledAt: todayAt(15, 10),
  },
  {
    id: 'TR-9201',
    status: 'IN_PROGRESS',
    originAgency: 'Agence Sousse',
    destinationAgency: 'Agence Sfax',
    parcelCount: 500,
    location: 'Dépôt Sahloul',
    scheduledAt: todayAt(13, 45),
  },
  {
    id: 'TR-9198',
    status: 'COMPLETED',
    originAgency: 'Agence Tunis',
    destinationAgency: 'Agence Sousse',
    parcelCount: 320,
    location: 'Hub Centre Ville Sousse',
    scheduledAt: todayAt(9, 20),
  },
  {
    id: 'TR-9195',
    status: 'COMPLETED',
    originAgency: 'Agence Sfax',
    destinationAgency: 'Agence Monastir',
    parcelCount: 180,
    location: 'Dépôt Sfax',
    scheduledAt: daysAgoAt(1, 16, 10),
  },
  {
    id: 'TR-9190',
    status: 'IN_PROGRESS',
    originAgency: 'Agence Monastir',
    destinationAgency: 'Agence Sousse',
    parcelCount: 95,
    location: 'Hub Monastir',
    scheduledAt: todayAt(14, 30),
  },
  {
    id: 'TR-9187',
    status: 'COMPLETED',
    originAgency: 'Agence Sousse',
    destinationAgency: 'Agence Tunis',
    parcelCount: 410,
    location: 'Dépôt Sahloul',
    scheduledAt: daysAgoAt(2, 10, 0),
  },
];

/** The undelivered remainder of an outbound transfer, travelling back to whoever shipped it. */
const mockReturns: Return[] = [
  {
    id: 'RET-6601',
    status: 'PENDING_PICKUP',
    fromAgency: 'Agence Sfax',
    toAgency: 'Agence Sousse',
    parcelCount: 50,
    relatedTransferId: 'TR-9201',
    location: 'Dépôt Sahloul',
    scheduledAt: todayAt(16, 0),
  },
  {
    id: 'RET-6598',
    status: 'PROCESSED',
    fromAgency: 'Agence Sousse',
    toAgency: 'Agence Tunis',
    parcelCount: 28,
    relatedTransferId: 'TR-9198',
    location: 'Hub Centre Ville Sousse',
    scheduledAt: daysAgoAt(1, 11, 30),
  },
  {
    id: 'RET-6595',
    status: 'PENDING_PICKUP',
    fromAgency: 'Agence Monastir',
    toAgency: 'Agence Sfax',
    parcelCount: 12,
    relatedTransferId: 'TR-9195',
    location: 'Hub Monastir',
    scheduledAt: todayAt(15, 15),
  },
  {
    id: 'RET-6592',
    status: 'PROCESSED',
    fromAgency: 'Agence Tunis',
    toAgency: 'Agence Sousse',
    parcelCount: 64,
    location: 'Dépôt Sahloul',
    scheduledAt: daysAgoAt(2, 9, 0),
  },
  {
    id: 'RET-6588',
    status: 'PENDING_PICKUP',
    fromAgency: 'Agence Sfax',
    toAgency: 'Agence Monastir',
    parcelCount: 7,
    location: 'Dépôt Sfax',
    scheduledAt: todayAt(17, 45),
  },
];

const mockNotifications: Notification[] = [
  {
    id: formatPickupId('3', today, 6),
    type: 'PICKUP',
    title: 'Pickup ready for collection',
    message: 'Librairie El Kitab, Sousse',
    timestamp: minutesAgo(3),
    read: false,
    target: { screen: 'pickups', tab: 'SCHEDULED', focusId: formatPickupId('3', today, 2) },
  },
  {
    id: `DL-3-${toCompactDateKey(today)}-0007`,
    type: 'DELIVERY',
    title: 'New stop added',
    message: 'Sarra Gharbi · Rue Ibn Khaldoun, Monastir',
    timestamp: minutesAgo(9),
    read: false,
    target: { screen: 'job', jobId: 'TRK-77F1E9AB' },
  },
  {
    id: `CS-3-${toCompactDateKey(today)}-0012`,
    type: 'CASH',
    title: 'Cash collected',
    message: `${formatCurrency(42)} from Amine Ben Salah`,
    timestamp: minutesAgo(24),
    read: true,
    target: { screen: 'job', jobId: 'TRK-5DF3697E' },
  },
  {
    id: `TR-3-${toCompactDateKey(today)}-0003`,
    type: 'TRANSFER',
    title: 'Transfer awaiting handoff',
    message: 'Agence Sousse → Agence Sfax at Dépôt Sahloul',
    timestamp: minutesAgo(40),
    read: true,
    target: { screen: 'transfers', tab: 'current', focusId: 'TR-9201' },
  },
  {
    id: `RT-3-${toCompactDateKey(yesterday)}-0004`,
    type: 'RETURN',
    title: 'Return flagged',
    message: 'Order #TRK-B6F31C08 refused',
    timestamp: daysAgoAt(1, 17, 5),
    read: true,
    target: { screen: 'runsheets', tab: 'history', focusId: 'TRK-B6F31C08' },
  },
  {
    id: formatPickupId('3', yesterday, 2),
    type: 'PICKUP',
    title: 'Pickup completed',
    message: 'Atelier Ben Youssef, Monastir',
    timestamp: daysAgoAt(1, 8, 35),
    read: true,
    target: { screen: 'pickups', tab: 'COMPLETED', focusId: formatPickupId('3', yesterday, 2) },
  },
  {
    id: `DL-3-${toCompactDateKey(yesterday)}-0021`,
    type: 'DELIVERY',
    title: 'Delivery confirmed',
    message: `${formatCurrency(42.6)} from Ines Trabelsi`,
    timestamp: daysAgoAt(1, 15, 50),
    read: true,
  },
];

let mockDriverStats: DriverStats = {
  delivered: 24,
  pending: 8,
  failed: 2,
  cashCollectedTotal: 486.5,
  completionPercent: 70,
  onPaceFinishTime: '5:30 PM',
  lifetimeDeliveries: 1204,
  deliveryRate: 98.4,
  weeklyCashCollected: 1284,
};

/** Backing counts for `deliveryRate` — only the derived percentage is exposed. */
let mockLifetimeAttempts = Math.round(
  mockDriverStats.lifetimeDeliveries / (mockDriverStats.deliveryRate / 100)
);

/** Delivered / attempted, to one decimal — recomputed from the running counts rather than nudged. */
function recomputeDeliveryRate(lifetimeDeliveries: number): number {
  if (mockLifetimeAttempts === 0) return 0;
  return Math.round((lifetimeDeliveries / mockLifetimeAttempts) * 1000) / 10;
}

/** Rolls a newly confirmed delivery into both today's stats and the lifetime/weekly ones. */
function recordDeliveryCompletion(cashAmount: number) {
  const lifetimeDeliveries = mockDriverStats.lifetimeDeliveries + 1;
  mockLifetimeAttempts += 1;

  mockDriverStats = {
    ...mockDriverStats,
    delivered: mockDriverStats.delivered + 1,
    pending: Math.max(0, mockDriverStats.pending - 1),
    cashCollectedTotal: mockDriverStats.cashCollectedTotal + cashAmount,
    lifetimeDeliveries,
    weeklyCashCollected: (mockDriverStats.weeklyCashCollected ?? 0) + cashAmount,
    deliveryRate: recomputeDeliveryRate(lifetimeDeliveries),
  };
}

/** A failed attempt counts against the delivery rate without adding a delivery. */
function recordDeliveryFailure() {
  mockLifetimeAttempts += 1;
  mockDriverStats = {
    ...mockDriverStats,
    failed: mockDriverStats.failed + 1,
    pending: Math.max(0, mockDriverStats.pending - 1),
    deliveryRate: recomputeDeliveryRate(mockDriverStats.lifetimeDeliveries),
  };
}

let mockUser: User = {
  id: 'u1',
  name: 'Amine Jendli',
  // Agencies provision accounts with a username (or the driver's work email),
  // not a phone number — matching is case-insensitive on either value.
  username: 'amine.jendli',
  email: 'amine.jendli@jibex.com',
  avatarInitials: 'AJ',
  driverCode: 'DRV-2841',
};

/** Dev-only mock credentials — irrelevant once login() calls a real API. */
const mockPassword = 'password123';

let mockVehicle: Vehicle = {
  type: 'motorcycle',
  plate: 'TU-2847-KL',
  model: 'Yamaha NMAX 155',
  color: 'Matte Black',
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface LoginResult {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

export interface ConfirmDeliveryResult extends WriteResult {
  job?: Job;
}

/** Accepts either the provisioned username or the driver's work email, case-insensitively — same as the real backend will. */
export async function login(username: string, password: string): Promise<LoginResult> {
  await delay(undefined);

  const identifier = username.trim().toLowerCase();
  const matchesIdentifier =
    identifier === mockUser.username.toLowerCase() || identifier === mockUser.email.toLowerCase();

  if (!matchesIdentifier || password !== mockPassword) {
    return { success: false, error: 'auth.login.errors.invalidCredentials' };
  }

  const token = `mock-token-${mockUser.id}-${Date.now()}`;
  // Kept exactly as a real sign-in is, so the app's start-up and sign-out
  // behave the same on mock data as on the server.
  await saveSession(token, {
    mode: 'mock',
    user: { ...mockUser },
    userId: mockUser.id,
    driverId: mockUser.id,
  });
  return { success: true, user: { ...mockUser }, token };
}

export async function logout(): Promise<void> {
  // Recent searches name customers: they don't stay for the next driver.
  await device.hydrateDeviceStore();
  await device.clearRecentSearches();
  await clearSession();
}

/** Mock data has no agency contact: the app shows the placeholders. */
export async function getDispatchContact(): Promise<DispatchContact> {
  return delay({});
}

/** The driver's vehicle, or null when nobody has recorded one. */
export async function getVehicle(): Promise<Vehicle | null> {
  return delay({ ...mockVehicle });
}

export async function getUser(): Promise<User> {
  return delay({ ...mockUser });
}

export async function getDriverStats(): Promise<DriverStats> {
  return delay({ ...mockDriverStats });
}

export async function getRunsheets(): Promise<Runsheet[]> {
  return delay(mockRunsheets.map(toRunsheet));
}

/**
 * Runs the agency closed today. On mock data the closed runs are already in
 * `getRunsheets`, so there is nothing more to add.
 */
export async function getClosedRunsheetsToday(): Promise<Runsheet[]> {
  return delay([]);
}

/**
 * Driver attests to having physically received every parcel on this
 * runsheet — flips `A_CONFIRMER` to `EN_COURS`, which is what unblocks its
 * parcels' status updates below. No-op (but still returns the current
 * state) if it's already past `A_CONFIRMER`.
 */
export interface RunsheetWriteResult extends WriteResult {
  runsheet?: Runsheet;
  /**
   * The receipt was confirmed but the run couldn't be started — the data
   * did change, so the screen refreshes to show "Start run".
   */
  confirmedOnly?: boolean;
}

/**
 * The driver refuses a run they were given — it goes back to dispatch and
 * off the driver's lists. A reason is required.
 */
export async function rejectRunsheet(id: string, reason: string): Promise<WriteResult> {
  await delay(undefined);
  if (!reason.trim()) return { success: false, error: 'runsheets.refuse.reasonRequired' };
  const index = mockRunsheets.findIndex((r) => r.id === id);
  if (index < 0) return { success: false, error: 'common.genericError' };
  mockRunsheets.splice(index, 1);
  return { success: true };
}

/**
 * The driver refuses only the parcels dispatch added after they signed —
 * those go back to dispatch; the rest of the run carries on.
 */
export async function rejectNewParcels(id: string, reason: string): Promise<WriteResult> {
  await delay(undefined);
  if (!reason.trim()) return { success: false, error: 'runsheets.refuse.reasonRequired' };
  const seed = mockRunsheets.find((r) => r.id === id);
  if (!seed || seed.confirmedStopCount === null) return { success: false, error: 'common.genericError' };
  seed.stopIds = seed.stopIds.slice(0, seed.confirmedStopCount);
  return { success: true };
}

export async function confirmRunsheetReceipt(id: string): Promise<RunsheetWriteResult> {
  await delay(undefined);
  const seed = mockRunsheets.find((r) => r.id === id);
  if (!seed) {
    return { success: false, error: 'common.genericError' };
  }
  if (seed.status === 'A_CONFIRMER') {
    seed.status = 'EN_COURS';
  }
  // Re-confirmation stamps whatever is actually in the van now, so a later
  // addition by dispatch flips `needsConfirmation` back on by itself.
  seed.confirmedStopCount = seed.stopIds.length;
  return { success: true, runsheet: toRunsheet(seed) };
}

/**
 * Every parcel the driver still has to work, flattened across all their
 * runsheets — the Runsheets tab shows these directly rather than a list of
 * runsheets to drill into. Delivered and failed parcels drop out entirely
 * and live in history instead.
 */
export async function getActiveParcels(): Promise<Job[]> {
  await delay(undefined);
  const ids = new Set(mockRunsheets.flatMap((r) => r.stopIds));
  const jobs = mockJobs.filter(
    (j) => ids.has(j.id) && j.status !== 'DELIVERED' && j.status !== 'FAILED'
  );
  // Stops on a run the driver hasn't signed for are inert either way, so
  // they sit after the ones actually in play rather than fighting either
  // ordering for a slot among them.
  const workable = jobs.filter((j) => !isJobBlockedByUnconfirmedRunsheet(j.id));
  const locked = jobs.filter((j) => isJobBlockedByUnconfirmedRunsheet(j.id));
  const ordered = await orderOpen(workable);
  return [...ordered, ...locked].map((j) => ({ ...j, packageInfo: { ...j.packageInfo } }));
}

/**
 * Everything already resolved — the history list. A parcel on a run that's
 * still open can be corrected; one on a closed (VALIDE) run is read-only.
 */
export async function getHistoryParcels(): Promise<Job[]> {
  await delay(undefined);
  const ids = new Set(mockRunsheets.flatMap((r) => r.stopIds));
  return mockJobs
    .filter((j) => ids.has(j.id) && (j.status === 'DELIVERED' || j.status === 'FAILED'))
    .map((j) => ({
      ...j,
      packageInfo: { ...j.packageInfo },
      correctable: mockRunsheets.find((r) => r.stopIds.includes(j.id))?.status !== 'VALIDE',
    }));
}

/**
 * Puts a resolved parcel back into the active list — the driver's escape
 * hatch for marking the wrong package. Rolls back whatever the original
 * resolution contributed to the running stats. Only while its run is open:
 * once the agency has closed it (VALIDE), the record stands.
 */
export async function reopenParcel(id: string): Promise<ConfirmDeliveryResult> {
  await delay(undefined);
  const job = mockJobs.find((j) => j.id === id);
  if (!job) {
    return { success: false, error: 'common.genericError' };
  }
  if (mockRunsheets.find((r) => r.stopIds.includes(id))?.status === 'VALIDE') {
    return { success: false, error: 'statusUpdate.runClosed' };
  }

  if (job.status === 'DELIVERED') {
    const refunded = job.cashCollected ?? 0;
    mockLifetimeAttempts = Math.max(0, mockLifetimeAttempts - 1);
    const lifetimeDeliveries = Math.max(0, mockDriverStats.lifetimeDeliveries - 1);
    mockDriverStats = {
      ...mockDriverStats,
      delivered: Math.max(0, mockDriverStats.delivered - 1),
      pending: mockDriverStats.pending + 1,
      cashCollectedTotal: Math.max(0, mockDriverStats.cashCollectedTotal - refunded),
      weeklyCashCollected: Math.max(0, (mockDriverStats.weeklyCashCollected ?? 0) - refunded),
      lifetimeDeliveries,
      deliveryRate: recomputeDeliveryRate(lifetimeDeliveries),
    };
    job.cashCollected = undefined;
    job.proofPhotoUri = undefined;
  } else if (job.status === 'FAILED') {
    mockLifetimeAttempts = Math.max(0, mockLifetimeAttempts - 1);
    mockDriverStats = {
      ...mockDriverStats,
      failed: Math.max(0, mockDriverStats.failed - 1),
      pending: mockDriverStats.pending + 1,
      deliveryRate: recomputeDeliveryRate(mockDriverStats.lifetimeDeliveries),
    };
    job.failureReason = undefined;
    job.failureNote = undefined;
    job.failureLocation = undefined;
  }

  job.status = 'PENDING';

  return { success: true, job: { ...job, packageInfo: { ...job.packageInfo } } };
}

/**
 * Records that the driver pressed Call for this parcel. Delivery is gated
 * on at least one attempt, and the count/timestamp are what dispatch sees
 * as proof the customer was contacted — no audio is captured.
 */
export async function logCallAttempt(id: string): Promise<Job> {
  await delay(undefined);
  const job = mockJobs.find((j) => j.id === id);
  if (!job) {
    throw new Error(`Job ${id} not found`);
  }
  const calls = await device.recordCall(id);
  job.callAttempts = calls.length;
  job.lastCallAt = calls.at(-1);
  return { ...job, packageInfo: { ...job.packageInfo } };
}

/** True while `jobId`'s runsheet is still awaiting receipt confirmation — blocks delivery/failure updates. */
function isJobBlockedByUnconfirmedRunsheet(jobId: string): boolean {
  const seed = mockRunsheets.find((r) => r.stopIds.includes(jobId));
  if (!seed) return false;
  // Both cases block: never confirmed, and confirmed against a count that has
  // since changed (dispatch added or pulled a parcel mid-day).
  return seed.status === 'A_CONFIRMER' || seed.confirmedStopCount !== seed.stopIds.length;
}

export async function getPickups(): Promise<Pickup[]> {
  await delay(undefined);
  const scheduled = device.applyListOrder(
    'pickups',
    mockPickups.filter((p) => p.status === 'SCHEDULED')
  );
  const rest = mockPickups.filter((p) => p.status !== 'SCHEDULED');
  return [...scheduled, ...rest].map((p) => ({ ...p }));
}

/**
 * Marks the given pickups collected, parcels and all. A merchant hand-off can
 * run to hundreds of parcels, and scanning each one at the counter isn't
 * practical — the driver signs for the whole stop instead.
 */
export async function completePickups(ids: string[]): Promise<BatchWriteResult> {
  await delay(undefined);
  const succeeded: string[] = [];
  const failed: string[] = [];
  for (const id of ids) {
    const pickup = mockPickups.find((p) => p.id === id);
    if (pickup?.status === 'SCHEDULED') {
      pickup.status = 'COMPLETED';
      succeeded.push(id);
    } else {
      failed.push(id);
    }
  }
  return { success: failed.length === 0, succeeded, failed };
}

/** One transfer, by id. */
export async function getTransfer(id: string): Promise<Transfer> {
  await delay(undefined);
  const transfer = mockTransfers.find((t) => t.id === id);
  if (!transfer) throw new Error(`Transfer ${id} not found`);
  return { ...transfer };
}

/** The driver confirms they've loaded a transfer. */
export async function confirmTransferPickup(transfer: Transfer): Promise<WriteResult> {
  await delay(undefined);
  const found = mockTransfers.find((t) => t.id === transfer.id);
  if (!found || found.status !== 'IN_PROGRESS') return { success: false, error: 'common.genericError' };
  // Like the real server: the batch goes in transit. It stays with the
  // driver (still "in progress") until the destination agency receives it.
  if (!found.awaitingPickupConfirmation) return { success: false, error: 'common.genericError' };
  found.awaitingPickupConfirmation = false;
  return { success: true };
}

export async function getTransfers(): Promise<Transfer[]> {
  await delay(undefined);
  const current = device.applyListOrder(
    'transfers',
    mockTransfers.filter((tr) => tr.status === 'IN_PROGRESS')
  );
  const rest = mockTransfers.filter((tr) => tr.status !== 'IN_PROGRESS');
  return [...current, ...rest].map((t) => ({ ...t }));
}

/**
 * Signs for return batches without scanning each one. A depot hand-back is
 * counted against the manifest at the counter, the same way a merchant pickup
 * is — scanning every batch individually is the exception, not the rule.
 */
export async function confirmReturns(ids: string[]): Promise<BatchWriteResult> {
  await delay(undefined);
  const succeeded: string[] = [];
  const failed: string[] = [];
  for (const id of ids) {
    const item = mockReturns.find((r) => r.id === id);
    if (item?.status === 'PENDING_PICKUP') {
      item.status = 'PROCESSED';
      succeeded.push(id);
    } else {
      failed.push(id);
    }
  }
  return { success: failed.length === 0, succeeded, failed };
}

export async function getReturns(): Promise<Return[]> {
  await delay(undefined);
  const pending = device.applyListOrder(
    'returns',
    mockReturns.filter((r) => r.status === 'PENDING_PICKUP')
  );
  const rest = mockReturns.filter((r) => r.status !== 'PENDING_PICKUP');
  return [...pending, ...rest].map((r) => ({ ...r }));
}

export async function getNotifications(): Promise<Notification[]> {
  return delay(mockNotifications.map((n) => ({ ...n })));
}

const DONE: WriteResult = { success: true };

export async function markNotificationRead(id: string): Promise<WriteResult> {
  const notification = mockNotifications.find((n) => n.id === id);
  if (notification) notification.read = true;
  return delay(DONE);
}

/** Puts an alert back to unread — the Mail-style swipe offers both ways. */
export async function markNotificationUnread(id: string): Promise<WriteResult> {
  const notification = mockNotifications.find((n) => n.id === id);
  if (notification) notification.read = false;
  return delay(DONE);
}

export async function deleteNotification(id: string): Promise<WriteResult> {
  const index = mockNotifications.findIndex((n) => n.id === id);
  if (index >= 0) mockNotifications.splice(index, 1);
  return delay(DONE);
}

export async function deleteAllNotifications(): Promise<WriteResult> {
  mockNotifications.length = 0;
  return delay(DONE);
}

export async function markAllNotificationsRead(): Promise<WriteResult> {
  mockNotifications.forEach((n) => {
    n.read = true;
  });
  return delay(DONE);
}

export async function getJobDetail(id: string): Promise<Job> {
  await delay(undefined);

  const job = mockJobs.find((j) => j.id === id);
  if (!job) {
    throw new Error(`Job ${id} not found`);
  }
  return { ...job, packageInfo: { ...job.packageInfo } };
}

/**
 * Reorders a runsheet's stops by nearest-neighbor distance from the depot
 * instead of handing back whatever order they were assigned in — this is
 * what keeps the driver from zig-zagging across town. Already-delivered/
 * failed stops are left at the end since they don't need routing.
 */
/**
 * Several jobs in one call. Home needs every stop across every runsheet to
 * compute the day's totals; asking for them one id at a time meant a promise
 * per parcel on every focus.
 */
export async function getJobsByIds(ids: string[]): Promise<Job[]> {
  await delay(undefined);
  const wanted = new Set(ids);
  return mockJobs
    .filter((j) => wanted.has(j.id))
    .map((j) => ({ ...j, packageInfo: { ...j.packageInfo } }));
}

/**
 * Same order Runsheets shows for these stops — nearest-first, or the
 * driver's own drag order once they've overridden it — so Home's next stop
 * never disagrees with what the list says comes next.
 */
export async function optimizeRouteOrder(stopIds: string[]): Promise<string[]> {
  const jobs = stopIds
    .map((id) => mockJobs.find((j) => j.id === id))
    .filter((j): j is Job => !!j);

  const outstanding = jobs.filter((j) => j.status === 'PENDING' || j.status === 'IN_TRANSIT');
  const done = jobs.filter((j) => j.status === 'DELIVERED' || j.status === 'FAILED');

  await delay(undefined);
  const ordered = await orderOpen(outstanding);
  return [...ordered.map((j) => j.id), ...done.map((j) => j.id)];
}

/** The nearest not-yet-delivered stop to wherever the driver just finished — recomputed live, not a fixed index. */
export async function getNextStopId(currentId: string): Promise<string | null> {
  await delay(undefined);

  const runsheet = mockRunsheets.find((r) => r.stopIds.includes(currentId));
  const currentJob = mockJobs.find((j) => j.id === currentId);
  if (!runsheet || !currentJob) return null;

  const remaining = runsheet.stopIds
    .map((id) => mockJobs.find((j) => j.id === id))
    .filter((j): j is Job => !!j && j.id !== currentId && j.status !== 'DELIVERED');

  if (remaining.length === 0) return null;
  return nearestNeighborOrder(remaining, currentJob.location ?? DEPOT)[0].id;
}

export async function confirmDeliveryWithOTP(
  id: string,
  otp: string,
  cashAmount: number
): Promise<ConfirmDeliveryResult> {
  await delay(undefined);

  const job = mockJobs.find((j) => j.id === id);
  if (!job) {
    return { success: false, error: 'common.genericError' };
  }
  if (isJobBlockedByUnconfirmedRunsheet(id)) {
    return { success: false, error: 'runsheets.confirm.blockedError' };
  }
  if (!device.hasCalled(id)) {
    return { success: false, error: 'statusUpdate.callRequired' };
  }

  const expectedOtp = otpByJobId[id];
  if (!expectedOtp || otp !== expectedOtp) {
    return { success: false, error: 'otp.errors.incorrectCode' };
  }

  const wasAlreadyDelivered = job.status === 'DELIVERED';
  job.status = 'DELIVERED';
  job.cashCollected = cashAmount;

  if (!wasAlreadyDelivered) {
    recordDeliveryCompletion(cashAmount);
  }

  return { success: true, job: { ...job, packageInfo: { ...job.packageInfo } } };
}

/**
 * Delivery confirmed by the driver on the doorstep, with no code and no photo.
 *
 * The same gates still apply — the run has to be signed for and the customer
 * has to have been called — but there is no proof artefact attached, so a
 * dispute over this one comes down to the driver's word. That is a deliberate
 * product decision: the OTP and photo routes remain for parcels that warrant
 * proof, and this is the fast path for the ones that don't.
 */
export async function confirmDelivery(
  id: string,
  cashAmount: number
): Promise<ConfirmDeliveryResult> {
  await delay(undefined);

  const job = mockJobs.find((j) => j.id === id);
  if (!job) {
    return { success: false, error: 'common.genericError' };
  }
  if (isJobBlockedByUnconfirmedRunsheet(id)) {
    return { success: false, error: 'runsheets.confirm.blockedError' };
  }
  if (!device.hasCalled(id)) {
    return { success: false, error: 'statusUpdate.callRequired' };
  }

  const wasAlreadyDelivered = job.status === 'DELIVERED';
  job.status = 'DELIVERED';
  job.cashCollected = cashAmount;

  if (!wasAlreadyDelivered) {
    recordDeliveryCompletion(cashAmount);
  }

  return { success: true, job: { ...job, packageInfo: { ...job.packageInfo } } };
}

/** Delivery confirmed by a doorstep photo instead of an OTP — same effect on stats, no code check. */
export async function confirmDeliveryWithPhoto(
  id: string,
  photoUri: string,
  cashAmount: number
): Promise<ConfirmDeliveryResult> {
  await delay(undefined);

  const job = mockJobs.find((j) => j.id === id);
  if (!job) {
    return { success: false, error: 'common.genericError' };
  }
  if (isJobBlockedByUnconfirmedRunsheet(id)) {
    return { success: false, error: 'runsheets.confirm.blockedError' };
  }
  if (!device.hasCalled(id)) {
    return { success: false, error: 'statusUpdate.callRequired' };
  }

  const wasAlreadyDelivered = job.status === 'DELIVERED';
  job.status = 'DELIVERED';
  job.cashCollected = cashAmount;
  job.proofPhotoUri = photoUri;

  if (!wasAlreadyDelivered) {
    recordDeliveryCompletion(cashAmount);
  }

  return { success: true, job: { ...job, packageInfo: { ...job.packageInfo } } };
}

export type FailDeliveryResult = ConfirmDeliveryResult;

export async function markDeliveryFailed(
  id: string,
  reason: DeliveryFailureReason,
  note?: string,
  location?: GeoPoint
): Promise<FailDeliveryResult> {
  await delay(undefined);

  const job = mockJobs.find((j) => j.id === id);
  if (!job) {
    return { success: false, error: 'common.genericError' };
  }
  if (isJobBlockedByUnconfirmedRunsheet(id)) {
    return { success: false, error: 'runsheets.confirm.blockedError' };
  }
  // "Other" tells dispatch nothing by itself — the note is the reason.
  if (reasonNeedsNote(reason) && !note?.trim()) {
    return { success: false, error: 'cantDeliver.noteRequired' };
  }

  const wasAlreadyFailed = job.status === 'FAILED';
  job.status = 'FAILED';
  job.failureReason = reason;
  job.failureNote = note;
  job.failureLocation = location;

  if (!wasAlreadyFailed) {
    recordDeliveryFailure();
  }

  return { success: true, job: { ...job, packageInfo: { ...job.packageInfo } } };
}

export interface ScanResult {
  success: boolean;
  label?: string;
  error?: string;
  /** What kind of entity matched — lets callers (e.g. the scanner screen) branch on distinct success feedback and track batch progress. */
  kind?: 'pickup' | 'job' | 'return' | 'transfer';
  /** The matched entity's own id — for returns/transfers this lets the caller track exactly which item in a list was just resolved. */
  id?: string;
  /** Found, but nothing was changed — a lookup, not a confirmation. */
  checkedOnly?: boolean;
}

/**
 * Validates a scanned/typed barcode against known pickups, jobs and returns.
 * A transfer is never closed from here: the destination agency does that.
 */
export async function confirmScan(code: string): Promise<ScanResult> {
  await delay(undefined);

  const trimmed = code.trim().toUpperCase();

  const pickup = mockPickups.find((p) => p.id.toUpperCase() === trimmed);
  if (pickup) {
    pickup.status = 'COMPLETED';
    return { success: true, label: pickup.businessName, kind: 'pickup', id: pickup.id };
  }

  const job = mockJobs.find((j) => j.id.toUpperCase() === trimmed);
  if (job) {
    return { success: true, label: job.customerName, kind: 'job', id: job.id, checkedOnly: true };
  }

  // A return batch is scanned by the manifest id printed on its paperwork.
  const returned = mockReturns.find((r) => r.id.toUpperCase() === trimmed);
  if (returned) {
    if (returned.status === 'PENDING_PICKUP') {
      returned.status = 'PROCESSED';
    }
    return {
      success: true,
      label: `${returned.fromAgency} → ${returned.toAgency}`,
      kind: 'return',
      id: returned.id,
    };
  }

  return { success: false, error: 'scanner.errors.notRecognized' };
}

/** A real backend would associate this token with the driver's account for server-sent push. */
export async function registerPushToken(token: string): Promise<void> {
  void token;
  await delay(undefined);
}
