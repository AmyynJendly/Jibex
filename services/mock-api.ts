import { addDays, toCompactDateKey, toDateKey } from '../lib/date';
import { formatCurrency } from '../lib/currency';
import { formatPickupId, formatRunsheetId, generateTrackingId } from '../lib/ids';
import type {
  Availability,
  DayAvailability,
  DeliveryFailureReason,
  DriverStats,
  GeoPoint,
  Job,
  Notification,
  PayoutInfo,
  Pickup,
  PickupParcel,
  Return,
  Runsheet,
  ShiftStatus,
  ShiftSummary,
  Transfer,
  User,
  Vehicle,
} from '../types';

/**
 * In-memory stand-in for the real backend. Every exported function has the
 * same name, signature, and return shape it will have once it calls a real
 * `fetch()` — swapping the body out for a real request shouldn't require
 * touching any screen that imports from here.
 */

// ---------------------------------------------------------------------------
// Latency simulation
// ---------------------------------------------------------------------------

function randomDelayMs() {
  return 300 + Math.random() * 300;
}

function delay<T>(value: T, ms = randomDelayMs()): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
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

function haversineMiles(a: GeoPoint, b: GeoPoint): number {
  const R = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Greedy nearest-neighbor — good enough for a same-day local route, not a true TSP solve. */
function nearestNeighborOrder(jobs: Job[], start: GeoPoint): Job[] {
  const remaining = [...jobs];
  const ordered: Job[] = [];
  let current = start;

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDist = Infinity;
    remaining.forEach((job, i) => {
      const d = haversineMiles(current, job.location);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIndex = i;
      }
    });
    const [next] = remaining.splice(nearestIndex, 1);
    ordered.push(next);
    current = next.location;
  }

  return ordered;
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
    packageInfo: { count: 1, weightLbs: 2.4, fragile: true, note: 'Leave with concierge if not home' },
    status: 'IN_TRANSIT',
    cashToCollect: 42.0,
    location: { lat: 35.8465, lng: 10.6015 },
    deliverBy: todayAt(14, 0),
  },
  {
    id: 'TRK-A12BC034',
    customerName: 'Karim Mejri',
    customerPhone: '+216 22 314 908',
    address: 'Avenue Farhat Hached, Sfax',
    packageInfo: { count: 2, weightLbs: 5.1, fragile: false },
    status: 'PENDING',
    cashToCollect: 28.5,
    location: { lat: 34.7398, lng: 10.76 },
  },
  {
    id: 'TRK-77F1E9AB',
    customerName: 'Sarra Gharbi',
    customerPhone: '+216 26 771 244',
    address: 'Rue Ibn Khaldoun, Monastir',
    packageInfo: { count: 1, weightLbs: 1.2, fragile: false },
    status: 'PENDING',
    cashToCollect: 65.0,
    location: { lat: 35.7643, lng: 10.8113 },
  },
  {
    id: 'TRK-3C4D8F21',
    customerName: 'Nizar Guesmi',
    customerPhone: '+216 24 590 118',
    address: 'Rue de Marseille, Sfax',
    packageInfo: { count: 3, weightLbs: 8.0, fragile: false },
    status: 'PENDING',
    cashToCollect: 15.0,
    location: { lat: 34.735, lng: 10.765 },
    deliverBy: todayAt(15, 0),
  },
  {
    id: 'TRK-9E0A2B6D',
    customerName: 'Rania Cherif',
    customerPhone: '+216 27 683 052',
    address: 'Avenue de la République, Monastir',
    packageInfo: { count: 1, weightLbs: 0.8, fragile: true, note: 'Ring twice' },
    status: 'PENDING',
    cashToCollect: 22.0,
    location: { lat: 35.77, lng: 10.82 },
  },
  {
    id: 'TRK-B6F31C08',
    customerName: 'Walid Ammar',
    customerPhone: '+216 21 908 366',
    address: 'Zone Industrielle, Sfax',
    packageInfo: { count: 4, weightLbs: 12.5, fragile: false },
    status: 'FAILED',
    failureReason: 'INCORRECT_ADDRESS',
    cashToCollect: 0,
    location: { lat: 34.72, lng: 10.69 },
  },
  {
    id: 'TRK-1F4A7D93',
    customerName: 'Ines Trabelsi',
    customerPhone: '+216 25 447 610',
    address: 'Boulevard 14 Janvier, Sousse',
    packageInfo: { count: 1, weightLbs: 3.0, fragile: false },
    status: 'DELIVERED',
    cashToCollect: 55.0,
    cashCollected: 55.0,
    location: { lat: 35.8256, lng: 10.6084 },
  },
  {
    id: 'TRK-6C2E9F45',
    customerName: 'Yassine Trabelsi',
    customerPhone: '+216 29 152 837',
    address: 'Avenue Habib Bourguiba, Tunis',
    packageInfo: { count: 1, weightLbs: 1.5, fragile: false },
    status: 'DELIVERED',
    cashToCollect: 30.0,
    cashCollected: 30.0,
    location: { lat: 36.7992, lng: 10.1817 },
  },
  {
    id: 'TRK-7A2E4F19',
    customerName: 'Amel Trabelsi',
    customerPhone: '+216 23 604 771',
    address: 'Route de Gabès, Sfax',
    packageInfo: { count: 1, weightLbs: 1.8, fragile: false },
    status: 'PENDING',
    cashToCollect: 19.0,
    location: { lat: 34.728, lng: 10.702 },
  },
  /** Yesterday's already-wrapped-up stops — feed the one historical (VALIDE) runsheet. */
  {
    id: 'TRK-99F0C3E2',
    customerName: 'Sami Belhaj',
    customerPhone: '+216 28 340 662',
    address: 'Rue de la République, Sousse',
    packageInfo: { count: 1, weightLbs: 2.0, fragile: false },
    status: 'DELIVERED',
    cashToCollect: 35.0,
    cashCollected: 35.0,
    location: { lat: 35.833, lng: 10.62 },
  },
  {
    id: 'TRK-88D4B716',
    customerName: 'Nadia Ferjani',
    customerPhone: '+216 22 917 384',
    address: 'Avenue Léopold Senghor, Sousse',
    packageInfo: { count: 2, weightLbs: 4.2, fragile: false },
    status: 'DELIVERED',
    cashToCollect: 47.5,
    cashCollected: 47.5,
    location: { lat: 35.845, lng: 10.63 },
  },
];

/** Raw seed shape — `stopCount`/`deliveredCount`/`completionPercent` are never trusted from here, always recomputed live from `mockJobs` (see `toRunsheet`) so they can't drift out of sync as job statuses change. */
type RunsheetSeed = Omit<Runsheet, 'stopCount' | 'deliveredCount' | 'completionPercent'>;

const mockRunsheets: RunsheetSeed[] = [
  {
    id: formatRunsheetId(today, 1),
    routeLabel: 'Route 12',
    zone: 'Sousse, Sahloul',
    agency: 'Agence Sousse',
    status: 'EN_COURS',
    stopIds: ['TRK-5DF3697E', 'TRK-A12BC034', 'TRK-77F1E9AB', 'TRK-1F4A7D93', 'TRK-B6F31C08'],
  },
  {
    id: formatRunsheetId(today, 2),
    routeLabel: 'Route 7',
    zone: 'Sfax, Zone Industrielle',
    agency: 'Agence Sousse',
    status: 'A_CONFIRMER',
    stopIds: ['TRK-3C4D8F21', 'TRK-7A2E4F19'],
  },
  {
    id: formatRunsheetId(today, 3),
    routeLabel: 'Route 4',
    zone: 'Monastir',
    agency: 'Agence Sousse',
    status: 'EN_COURS',
    stopIds: ['TRK-9E0A2B6D', 'TRK-6C2E9F45'],
  },
  {
    id: formatRunsheetId(yesterday, 1),
    routeLabel: 'Route 9',
    zone: 'Sousse, Centre Ville',
    agency: 'Agence Sousse',
    status: 'VALIDE',
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

  return { ...seed, stopIds: [...seed.stopIds], stopCount, deliveredCount, completionPercent };
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
    id: 'TR-9201',
    status: 'IN_PROGRESS',
    origin: 'Route 12',
    destination: 'Route 7',
    itemCount: 6,
    location: 'Dépôt Sahloul',
    scheduledAt: todayAt(13, 45),
  },
  {
    id: 'TR-9198',
    status: 'COMPLETED',
    origin: 'Route 4',
    destination: 'Route 12',
    itemCount: 3,
    location: 'Hub Centre Ville Sousse',
    scheduledAt: todayAt(9, 20),
  },
  {
    id: 'TR-9195',
    status: 'COMPLETED',
    origin: 'Route 7',
    destination: 'Route 4',
    itemCount: 5,
    location: 'Dépôt Sfax',
    scheduledAt: daysAgoAt(1, 16, 10),
  },
  {
    id: 'TR-9190',
    status: 'IN_PROGRESS',
    origin: 'Route 3',
    destination: 'Route 12',
    itemCount: 2,
    location: 'Hub Monastir',
    scheduledAt: todayAt(14, 30),
  },
  {
    id: 'TR-9187',
    status: 'COMPLETED',
    origin: 'Route 12',
    destination: 'Route 3',
    itemCount: 8,
    location: 'Dépôt Sahloul',
    scheduledAt: daysAgoAt(2, 10, 0),
  },
];

/** Historical parcel this return is tied to — predates the current active runsheet, so it won't resolve via `getJobDetail`, same as a real backend would return for a closed-out past delivery. */
const mockReturns: Return[] = [
  {
    id: 'RET-6601',
    status: 'PENDING_PICKUP',
    reason: 'REFUSED',
    relatedJobId: 'TRK-88C1E3AA',
    customerName: 'Yassine Trabelsi',
    address: 'Avenue Habib Bourguiba, Tunis',
  },
  {
    id: 'RET-6598',
    status: 'PROCESSED',
    reason: 'ADDRESS_ISSUE',
    relatedJobId: 'TRK-4B7D2E19',
    customerName: 'Nour Chaabane',
    address: 'Rue de Marseille, Sfax',
  },
  {
    id: 'RET-6595',
    status: 'PENDING_PICKUP',
    reason: 'DAMAGED',
    relatedJobId: 'TRK-D2F80C56',
    customerName: 'Wassim Jaziri',
    address: 'Avenue de la République, Monastir',
  },
  {
    id: 'RET-6592',
    status: 'PROCESSED',
    reason: 'REFUSED',
    relatedJobId: 'TRK-0AE93F71',
    customerName: 'Salma Kort',
    address: 'Rue Ibn Khaldoun, Monastir',
  },
  {
    id: 'RET-6588',
    status: 'PENDING_PICKUP',
    reason: 'ADDRESS_ISSUE',
    relatedJobId: 'TRK-F13C6A28',
    customerName: 'Hedi Bouzid',
    address: 'Zone Industrielle, Sfax',
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
  },
  {
    id: `DL-3-${toCompactDateKey(today)}-0007`,
    type: 'DELIVERY',
    title: 'New stop added',
    message: 'Sarra Gharbi · Rue Ibn Khaldoun, Monastir',
    timestamp: minutesAgo(9),
    read: false,
  },
  {
    id: `CS-3-${toCompactDateKey(today)}-0012`,
    type: 'CASH',
    title: 'Cash collected',
    message: `${formatCurrency(42)} from Amine Ben Salah`,
    timestamp: minutesAgo(24),
    read: true,
  },
  {
    id: `TR-3-${toCompactDateKey(today)}-0003`,
    type: 'TRANSFER',
    title: 'Transfer awaiting handoff',
    message: 'Route 12 → Route 7 at Dépôt Sahloul',
    timestamp: minutesAgo(40),
    read: true,
  },
  {
    id: `RT-3-${toCompactDateKey(yesterday)}-0004`,
    type: 'RETURN',
    title: 'Return flagged',
    message: 'Order #TRK-88C1E3AA refused',
    timestamp: daysAgoAt(1, 17, 5),
    read: true,
  },
  {
    id: formatPickupId('3', yesterday, 2),
    type: 'PICKUP',
    title: 'Pickup completed',
    message: 'Atelier Ben Youssef, Monastir',
    timestamp: daysAgoAt(1, 8, 35),
    read: true,
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
  pickupsCount: 5,
  cashCollectedTotal: 486.5,
  completionPercent: 70,
  onPaceFinishTime: '5:30 PM',
  lifetimeDeliveries: 1204,
  onTimeRate: 98.4,
  weeklyCashCollected: 1284,
};

/** Backing count for `onTimeRate` — not itself exposed, only the derived percentage is. */
let mockOnTimeCount = Math.round(mockDriverStats.lifetimeDeliveries * (mockDriverStats.onTimeRate / 100));

/** Rolls a newly confirmed delivery into both today's stats and the lifetime/weekly ones. */
function recordDeliveryCompletion(cashAmount: number, onTime: boolean) {
  const lifetimeDeliveries = mockDriverStats.lifetimeDeliveries + 1;
  mockOnTimeCount += onTime ? 1 : 0;

  mockDriverStats = {
    ...mockDriverStats,
    delivered: mockDriverStats.delivered + 1,
    pending: Math.max(0, mockDriverStats.pending - 1),
    cashCollectedTotal: mockDriverStats.cashCollectedTotal + cashAmount,
    lifetimeDeliveries,
    weeklyCashCollected: mockDriverStats.weeklyCashCollected + cashAmount,
    onTimeRate: Math.round((mockOnTimeCount / lifetimeDeliveries) * 1000) / 10,
  };
}

let mockUser: User = {
  id: 'u1',
  name: 'Marcus Alden',
  // Digits only — a real backend normalizes phone input the same way before
  // comparing, and this keeps the value fully typeable on a phone-pad keyboard.
  username: '21620456789',
  email: 'marcus.alden@jibex.com',
  avatarInitials: 'MA',
  driverCode: 'DRV-2841',
};

/** Dev-only mock credentials — irrelevant once login() calls a real API. */
const mockPassword = 'password123';

let mockShiftStatus: ShiftStatus = { isActive: false, startedAt: null };

/** Mon-Thu AM+PM, Fri AM+PM+Eve, Sat AM only, Sun off — same shape as the driver's old weekly pattern, seeded onto real upcoming dates. */
function defaultDayAvailability(weekday: number): DayAvailability {
  if (weekday === 0) return { morning: false, afternoon: false, evening: false }; // Sunday
  if (weekday === 6) return { morning: true, afternoon: false, evening: false }; // Saturday
  if (weekday === 5) return { morning: true, afternoon: true, evening: true }; // Friday
  return { morning: true, afternoon: true, evening: false }; // Mon-Thu
}

function seedAvailability(days: number): Availability {
  const availability: Availability = {};
  for (let i = 0; i < days; i++) {
    const date = addDays(new Date(), i);
    availability[toDateKey(date)] = defaultDayAvailability(date.getDay());
  }
  return availability;
}

let mockAvailability: Availability = seedAvailability(21);

let mockVehicle: Vehicle = {
  type: 'motorcycle',
  plate: 'TU-2847-KL',
  model: 'Yamaha NMAX 155',
  color: 'Matte Black',
};

let mockPayoutInfo: PayoutInfo = {
  bankName: 'Banque de Tunisie',
  accountHolder: 'Marcus Alden',
  iban: 'TN59 1000 6035 0000 0123 4567',
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

export interface ConfirmDeliveryResult {
  success: boolean;
  job?: Job;
  error?: string;
}

export async function login(username: string, password: string): Promise<LoginResult> {
  await delay(undefined);

  if (username !== mockUser.username || password !== mockPassword) {
    return { success: false, error: 'auth.login.errors.invalidCredentials' };
  }

  return {
    success: true,
    user: { ...mockUser },
    token: `mock-token-${mockUser.id}-${Date.now()}`,
  };
}

export interface RegisterParams {
  name: string;
  phone: string;
  email?: string;
  vehiclePlate: string;
  password: string;
}

function initialsFor(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');
}

export async function register(params: RegisterParams): Promise<LoginResult> {
  await delay(undefined);

  const user: User = {
    id: `driver-${Date.now()}`,
    name: params.name.trim(),
    username: params.phone.replace(/\D/g, ''),
    email: params.email?.trim() ?? '',
    avatarInitials: initialsFor(params.name),
    driverCode: `DRV-${Math.floor(1000 + Math.random() * 9000)}`,
  };

  return {
    success: true,
    user,
    token: `mock-token-${user.id}-${Date.now()}`,
  };
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

export async function getRunsheet(id: string): Promise<Runsheet> {
  await delay(undefined);
  const seed = mockRunsheets.find((r) => r.id === id);
  if (!seed) {
    throw new Error(`Runsheet ${id} not found`);
  }
  return toRunsheet(seed);
}

/** A runsheet's own parcels, in stop order — same shape `getJobDetail` returns for one. */
export async function getRunsheetJobs(id: string): Promise<Job[]> {
  await delay(undefined);
  const seed = mockRunsheets.find((r) => r.id === id);
  if (!seed) {
    throw new Error(`Runsheet ${id} not found`);
  }
  return seed.stopIds
    .map((jobId) => mockJobs.find((j) => j.id === jobId))
    .filter((j): j is Job => !!j)
    .map((j) => ({ ...j, packageInfo: { ...j.packageInfo } }));
}

/**
 * Driver attests to having physically received every parcel on this
 * runsheet — flips `A_CONFIRMER` to `EN_COURS`, which is what unblocks its
 * parcels' status updates below. No-op (but still returns the current
 * state) if it's already past `A_CONFIRMER`.
 */
export async function confirmRunsheetReceipt(id: string): Promise<Runsheet> {
  await delay(undefined);
  const seed = mockRunsheets.find((r) => r.id === id);
  if (!seed) {
    throw new Error(`Runsheet ${id} not found`);
  }
  if (seed.status === 'A_CONFIRMER') {
    seed.status = 'EN_COURS';
  }
  return toRunsheet(seed);
}

/** True while `jobId`'s runsheet is still awaiting receipt confirmation — blocks delivery/failure updates. */
function isJobBlockedByUnconfirmedRunsheet(jobId: string): boolean {
  const runsheet = mockRunsheets.find((r) => r.stopIds.includes(jobId));
  return runsheet?.status === 'A_CONFIRMER';
}

/** Once every stop on a runsheet has been attempted (delivered or failed), the runsheet itself is done — flips it to VALIDE so it moves out of "current" into history. */
function maybeCompleteRunsheet(jobId: string) {
  const seed = mockRunsheets.find((r) => r.stopIds.includes(jobId));
  if (!seed || seed.status === 'VALIDE') return;

  const jobs = seed.stopIds.map((id) => mockJobs.find((j) => j.id === id)).filter((j): j is Job => !!j);
  const allAttempted = jobs.length > 0 && jobs.every((j) => j.status === 'DELIVERED' || j.status === 'FAILED');
  if (allAttempted) {
    seed.status = 'VALIDE';
  }
}

export async function getPickups(): Promise<Pickup[]> {
  return delay(mockPickups.map((p) => ({ ...p })));
}

export async function getTransfers(): Promise<Transfer[]> {
  return delay(mockTransfers.map((t) => ({ ...t })));
}

export async function getReturns(): Promise<Return[]> {
  return delay(mockReturns.map((r) => ({ ...r })));
}

/** Attaches a locally captured photo (device URI) documenting a damaged return. */
export async function attachReturnPhoto(id: string, photoUri: string): Promise<Return> {
  await delay(undefined);

  const item = mockReturns.find((r) => r.id === id);
  if (!item) {
    throw new Error(`Return ${id} not found`);
  }

  item.photoUris = [...(item.photoUris ?? []), photoUri];
  return { ...item };
}

export async function getNotifications(): Promise<Notification[]> {
  return delay(mockNotifications.map((n) => ({ ...n })));
}

export async function markNotificationRead(id: string): Promise<void> {
  const notification = mockNotifications.find((n) => n.id === id);
  if (notification) notification.read = true;
  await delay(undefined);
}

export async function markAllNotificationsRead(): Promise<void> {
  mockNotifications.forEach((n) => {
    n.read = true;
  });
  await delay(undefined);
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
export async function optimizeRouteOrder(stopIds: string[]): Promise<string[]> {
  const jobs = stopIds
    .map((id) => mockJobs.find((j) => j.id === id))
    .filter((j): j is Job => !!j);

  const outstanding = jobs.filter((j) => j.status === 'PENDING' || j.status === 'IN_TRANSIT');
  const done = jobs.filter((j) => j.status === 'DELIVERED' || j.status === 'FAILED');

  const ordered = nearestNeighborOrder(outstanding, DEPOT);
  return delay([...ordered.map((j) => j.id), ...done.map((j) => j.id)]);
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
  return nearestNeighborOrder(remaining, currentJob.location)[0].id;
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
    return { success: false, error: 'runsheetDetail.blockedNotice' };
  }

  const expectedOtp = otpByJobId[id];
  if (!expectedOtp || otp !== expectedOtp) {
    return { success: false, error: 'otp.errors.incorrectCode' };
  }

  const wasAlreadyDelivered = job.status === 'DELIVERED';
  job.status = 'DELIVERED';
  job.cashCollected = cashAmount;

  if (!wasAlreadyDelivered) {
    const onTime = !job.deliverBy || Date.now() <= new Date(job.deliverBy).getTime();
    recordDeliveryCompletion(cashAmount, onTime);
  }
  maybeCompleteRunsheet(id);

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
    return { success: false, error: 'runsheetDetail.blockedNotice' };
  }

  const wasAlreadyDelivered = job.status === 'DELIVERED';
  job.status = 'DELIVERED';
  job.cashCollected = cashAmount;
  job.proofPhotoUri = photoUri;

  if (!wasAlreadyDelivered) {
    const onTime = !job.deliverBy || Date.now() <= new Date(job.deliverBy).getTime();
    recordDeliveryCompletion(cashAmount, onTime);
  }
  maybeCompleteRunsheet(id);

  return { success: true, job: { ...job, packageInfo: { ...job.packageInfo } } };
}

export interface FailDeliveryResult {
  success: boolean;
  job?: Job;
  error?: string;
}

export async function markDeliveryFailed(
  id: string,
  reason: DeliveryFailureReason,
  note?: string
): Promise<FailDeliveryResult> {
  await delay(undefined);

  const job = mockJobs.find((j) => j.id === id);
  if (!job) {
    return { success: false, error: 'common.genericError' };
  }
  if (isJobBlockedByUnconfirmedRunsheet(id)) {
    return { success: false, error: 'runsheetDetail.blockedNotice' };
  }

  const wasAlreadyFailed = job.status === 'FAILED';
  job.status = 'FAILED';
  job.failureReason = reason;
  job.failureNote = note;

  if (!wasAlreadyFailed) {
    mockDriverStats = {
      ...mockDriverStats,
      failed: mockDriverStats.failed + 1,
      pending: Math.max(0, mockDriverStats.pending - 1),
    };
  }
  maybeCompleteRunsheet(id);

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
}

/** QR payload generated by the Transfers screen — see `app/transfers.tsx`. */
const TRANSFER_CODE_PREFIX = 'JIBEX-TRANSFER:';

/** Validates a scanned/typed barcode against known pickups, jobs, returns, and transfer handoff QRs. */
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
    return { success: true, label: job.customerName, kind: 'job', id: job.id };
  }

  // Returns are scanned by the tracking number printed on the parcel
  // (`relatedJobId`), not the internal `RET-…` id — falls back to the
  // internal id too, in case it's typed in manually.
  const returned = mockReturns.find(
    (r) => r.relatedJobId.toUpperCase() === trimmed || r.id.toUpperCase() === trimmed
  );
  if (returned) {
    if (returned.status === 'PENDING_PICKUP') {
      returned.status = 'PROCESSED';
    }
    return { success: true, label: returned.customerName, kind: 'return', id: returned.id };
  }

  if (trimmed.startsWith(TRANSFER_CODE_PREFIX)) {
    const transferId = trimmed.slice(TRANSFER_CODE_PREFIX.length);
    const transfer = mockTransfers.find((t) => t.id.toUpperCase() === transferId);
    if (transfer) {
      // No multi-account system yet — scanning the QR simulates the
      // receiving courier confirming custody, same as `confirmScan`
      // already stands in for a receiving driver's device generally.
      if (transfer.status === 'IN_PROGRESS') {
        transfer.status = 'COMPLETED';
      }
      return {
        success: true,
        label: `${transfer.origin} → ${transfer.destination}`,
        kind: 'transfer',
        id: transfer.id,
      };
    }
    return { success: false, error: 'scanner.errors.notRecognized' };
  }

  return { success: false, error: 'scanner.errors.notRecognized' };
}

export async function getShiftStatus(): Promise<ShiftStatus> {
  return delay({ ...mockShiftStatus });
}

export async function startShift(): Promise<ShiftStatus> {
  mockShiftStatus = { isActive: true, startedAt: new Date().toISOString() };
  return delay({ ...mockShiftStatus });
}

export async function endShift(): Promise<ShiftSummary> {
  await delay(undefined);

  const startedAt = mockShiftStatus.startedAt ?? new Date().toISOString();
  const endedAt = new Date().toISOString();
  const durationMinutes = Math.max(
    1,
    Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60_000)
  );

  const summary: ShiftSummary = {
    startedAt,
    endedAt,
    durationMinutes,
    delivered: mockDriverStats.delivered,
    failed: mockDriverStats.failed,
    distanceMiles:
      Math.round((mockDriverStats.delivered * 2.3 + mockDriverStats.failed * 1.1) * 10) / 10,
    cashCollected: mockDriverStats.cashCollectedTotal,
  };

  mockShiftStatus = { isActive: false, startedAt: null };
  return summary;
}

/** Driver hands off the day's cash (deposit, office drop-off, etc.) — zeroes the running total. */
export async function confirmCashHandoff(): Promise<void> {
  await delay(undefined);
  mockDriverStats = { ...mockDriverStats, cashCollectedTotal: 0 };
}

export async function getAvailability(): Promise<Availability> {
  return delay(JSON.parse(JSON.stringify(mockAvailability)));
}

export async function setAvailability(availability: Availability): Promise<void> {
  mockAvailability = JSON.parse(JSON.stringify(availability));
  await delay(undefined);
}

/** A real backend would associate this token with the driver's account for server-sent push. */
export async function registerPushToken(token: string): Promise<void> {
  void token;
  await delay(undefined);
}

export interface UpdateUserParams {
  name: string;
  phone: string;
  email: string;
}

export async function updateUser(params: UpdateUserParams): Promise<User> {
  mockUser = {
    ...mockUser,
    name: params.name,
    username: params.phone.replace(/\D/g, ''),
    email: params.email,
    avatarInitials: initialsFor(params.name),
  };
  return delay({ ...mockUser });
}

export async function getVehicle(): Promise<Vehicle> {
  return delay({ ...mockVehicle });
}

export async function updateVehicle(vehicle: Vehicle): Promise<void> {
  mockVehicle = { ...vehicle };
  await delay(undefined);
}

export async function getPayoutInfo(): Promise<PayoutInfo> {
  return delay({ ...mockPayoutInfo });
}

export async function updatePayoutInfo(payout: PayoutInfo): Promise<void> {
  mockPayoutInfo = { ...payout };
  await delay(undefined);
}
