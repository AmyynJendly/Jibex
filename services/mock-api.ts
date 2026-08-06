import { addDays, toDateKey } from '../lib/date';
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

/** Not part of the public Job shape — a real API wouldn't hand the driver
 *  app the correct code either; it's only known to confirmDeliveryWithOTP. */
const otpByJobId: Record<string, string> = {
  'JBX-48213': '4187',
  'JBX-48214': '2093',
  'JBX-48215': '5521',
  'JBX-48216': '7734',
};

const mockJobs: Job[] = [
  {
    id: 'JBX-48213',
    customerName: 'Amine Ben Salah',
    address: 'Rue de la Liberté, Sahloul, Sousse',
    packageInfo: { count: 1, weightLbs: 2.4, fragile: true, note: 'Leave with concierge if not home' },
    status: 'in-transit',
    cashToCollect: 42.0,
    location: { lat: 35.8465, lng: 10.6015 },
    deliverBy: todayAt(14, 0),
  },
  {
    id: 'JBX-48214',
    customerName: 'Karim Mejri',
    address: 'Avenue Farhat Hached, Sfax',
    packageInfo: { count: 2, weightLbs: 5.1, fragile: false },
    status: 'pending',
    cashToCollect: 28.5,
    location: { lat: 34.7398, lng: 10.76 },
  },
  {
    id: 'JBX-48215',
    customerName: 'Sarra Gharbi',
    address: 'Rue Ibn Khaldoun, Monastir',
    packageInfo: { count: 1, weightLbs: 1.2, fragile: false },
    status: 'pending',
    cashToCollect: 65.0,
    location: { lat: 35.7643, lng: 10.8113 },
  },
  {
    id: 'JBX-48216',
    customerName: 'Nizar Guesmi',
    address: 'Rue de Marseille, Sfax',
    packageInfo: { count: 3, weightLbs: 8.0, fragile: false },
    status: 'pending',
    cashToCollect: 15.0,
    location: { lat: 34.735, lng: 10.765 },
    deliverBy: todayAt(15, 0),
  },
  {
    id: 'JBX-48217',
    customerName: 'Rania Cherif',
    address: 'Avenue de la République, Monastir',
    packageInfo: { count: 1, weightLbs: 0.8, fragile: true, note: 'Ring twice' },
    status: 'failed',
    cashToCollect: 22.0,
    location: { lat: 35.77, lng: 10.82 },
  },
  {
    id: 'JBX-48218',
    customerName: 'Walid Ammar',
    address: 'Zone Industrielle, Sfax',
    packageInfo: { count: 4, weightLbs: 12.5, fragile: false },
    status: 'failed',
    cashToCollect: 0,
    location: { lat: 34.72, lng: 10.69 },
  },
  {
    id: 'JBX-48219',
    customerName: 'Ines Trabelsi',
    address: 'Boulevard 14 Janvier, Sousse',
    packageInfo: { count: 1, weightLbs: 3.0, fragile: false },
    status: 'delivered',
    cashToCollect: 55.0,
    cashCollected: 55.0,
    location: { lat: 35.8256, lng: 10.6084 },
  },
  {
    id: 'JBX-48220',
    customerName: 'Yassine Trabelsi',
    address: 'Avenue Habib Bourguiba, Tunis',
    packageInfo: { count: 1, weightLbs: 1.5, fragile: false },
    status: 'delivered',
    cashToCollect: 30.0,
    cashCollected: 30.0,
    location: { lat: 36.7992, lng: 10.1817 },
  },
];

const mockRunsheets: Runsheet[] = [
  {
    id: 'RS-12',
    routeLabel: 'Route 12',
    zone: 'Sousse, Sahloul',
    status: 'in-progress',
    stopCount: 4,
    completionPercent: 25,
    stopIds: ['JBX-48213', 'JBX-48214', 'JBX-48215', 'JBX-48219'],
  },
  {
    id: 'RS-7',
    routeLabel: 'Route 7',
    zone: 'Sfax, Zone Industrielle',
    status: 'waiting',
    stopCount: 2,
    completionPercent: 0,
    stopIds: ['JBX-48216', 'JBX-48218'],
  },
  {
    id: 'RS-4',
    routeLabel: 'Route 4',
    zone: 'Monastir',
    status: 'confirmed',
    stopCount: 2,
    completionPercent: 50,
    stopIds: ['JBX-48217', 'JBX-48220'],
  },
];

const mockPickups: Pickup[] = [
  {
    id: 'PU-48301',
    businessName: 'Manufacture Tounsi Textile',
    address: 'Zone Industrielle, Sfax',
    status: 'scheduled',
    requestedByDate: todayAt(0, 0),
    timeWindow: '11:30–12:00',
    packageCount: 12,
  },
  {
    id: 'PU-48302',
    businessName: 'Librairie El Kitab',
    address: 'Avenue Habib Bourguiba, Sousse',
    status: 'scheduled',
    requestedByDate: todayAt(0, 0),
    timeWindow: '2:00–2:30 PM',
    packageCount: 4,
  },
  {
    id: 'PU-48303',
    businessName: 'Pharmacie El Amen',
    address: 'Rue de la Liberté, Sousse',
    status: 'scheduled',
    requestedByDate: todayAt(0, 0),
    timeWindow: '3:30–4:00 PM',
    packageCount: 2,
  },
  {
    id: 'PU-48304',
    businessName: 'Superette Boubaker',
    address: 'Avenue Farhat Hached, Sfax',
    status: 'completed',
    requestedByDate: todayAt(0, 0),
    timeWindow: '9:00–9:30 AM',
    packageCount: 6,
  },
  {
    id: 'PU-48305',
    businessName: 'Atelier Ben Youssef',
    address: 'Rue Ibn Khaldoun, Monastir',
    status: 'completed',
    requestedByDate: daysAgoAt(1, 0, 0),
    timeWindow: '8:00–8:30 AM',
    packageCount: 3,
  },
  {
    id: 'PU-48306',
    businessName: 'Boutique Ines',
    address: 'Boulevard 14 Janvier, Sousse',
    status: 'scheduled',
    requestedByDate: todayAt(0, 0),
    timeWindow: '5:00–5:30 PM',
    packageCount: 1,
  },
];

const mockTransfers: Transfer[] = [
  {
    id: 'TR-9201',
    status: 'in-progress',
    origin: 'Route 12',
    destination: 'Route 7',
    itemCount: 6,
    location: 'Dépôt Sahloul',
    scheduledAt: todayAt(13, 45),
  },
  {
    id: 'TR-9198',
    status: 'completed',
    origin: 'Route 4',
    destination: 'Route 12',
    itemCount: 3,
    location: 'Hub Centre Ville Sousse',
    scheduledAt: todayAt(9, 20),
  },
  {
    id: 'TR-9195',
    status: 'completed',
    origin: 'Route 7',
    destination: 'Route 4',
    itemCount: 5,
    location: 'Dépôt Sfax',
    scheduledAt: daysAgoAt(1, 16, 10),
  },
  {
    id: 'TR-9190',
    status: 'in-progress',
    origin: 'Route 3',
    destination: 'Route 12',
    itemCount: 2,
    location: 'Hub Monastir',
    scheduledAt: todayAt(14, 30),
  },
  {
    id: 'TR-9187',
    status: 'completed',
    origin: 'Route 12',
    destination: 'Route 3',
    itemCount: 8,
    location: 'Dépôt Sahloul',
    scheduledAt: daysAgoAt(2, 10, 0),
  },
];

const mockReturns: Return[] = [
  {
    id: 'RET-6601',
    status: 'pending-pickup',
    reason: 'refused',
    relatedJobId: 'JBX-47810',
    customerName: 'Yassine Trabelsi',
    address: 'Avenue Habib Bourguiba, Tunis',
  },
  {
    id: 'RET-6598',
    status: 'processed',
    reason: 'address-issue',
    relatedJobId: 'JBX-47612',
    customerName: 'Nour Chaabane',
    address: 'Rue de Marseille, Sfax',
  },
  {
    id: 'RET-6595',
    status: 'pending-pickup',
    reason: 'damaged',
    relatedJobId: 'JBX-47590',
    customerName: 'Wassim Jaziri',
    address: 'Avenue de la République, Monastir',
  },
  {
    id: 'RET-6592',
    status: 'processed',
    reason: 'refused',
    relatedJobId: 'JBX-47455',
    customerName: 'Salma Kort',
    address: 'Rue Ibn Khaldoun, Monastir',
  },
  {
    id: 'RET-6588',
    status: 'pending-pickup',
    reason: 'address-issue',
    relatedJobId: 'JBX-47320',
    customerName: 'Hedi Bouzid',
    address: 'Zone Industrielle, Sfax',
  },
];

const mockNotifications: Notification[] = [
  {
    id: 'PU-3-20260804-0002',
    type: 'pickup',
    title: 'Pickup ready for collection',
    message: 'Librairie El Kitab, Sousse',
    timestamp: minutesAgo(3),
    read: false,
  },
  {
    id: 'DL-3-20260804-0007',
    type: 'delivery',
    title: 'New stop added',
    message: 'Sarra Gharbi · Rue Ibn Khaldoun, Monastir',
    timestamp: minutesAgo(9),
    read: false,
  },
  {
    id: 'CS-3-20260804-0012',
    type: 'cash',
    title: 'Cash collected',
    message: '42.00 DT from Amine Ben Salah',
    timestamp: minutesAgo(24),
    read: true,
  },
  {
    id: 'TR-3-20260804-0003',
    type: 'transfer',
    title: 'Transfer awaiting handoff',
    message: 'Route 12 → Route 7 at Dépôt Sahloul',
    timestamp: minutesAgo(40),
    read: true,
  },
  {
    id: 'RT-3-20260803-0004',
    type: 'return',
    title: 'Return flagged',
    message: 'Order #JBX-47810 refused',
    timestamp: daysAgoAt(1, 17, 5),
    read: true,
  },
  {
    id: 'PU-3-20260803-0009',
    type: 'pickup',
    title: 'Pickup completed',
    message: 'Atelier Ben Youssef, Monastir',
    timestamp: daysAgoAt(1, 8, 35),
    read: true,
  },
  {
    id: 'DL-3-20260803-0021',
    type: 'delivery',
    title: 'Delivery confirmed',
    message: '42.60 DT from Ines Trabelsi',
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
};

let mockUser: User = {
  id: 'u1',
  name: 'Marcus Alden',
  // Digits only — a real backend normalizes phone input the same way before
  // comparing, and this keeps the value fully typeable on a phone-pad keyboard.
  username: '21620456789',
  email: 'marcus.alden@jibex.com',
  avatarInitials: 'MA',
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
    return { success: false, error: 'Incorrect phone number or password.' };
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
  email: string;
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
    email: params.email.trim(),
    avatarInitials: initialsFor(params.name),
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
  return delay(mockRunsheets.map((r) => ({ ...r, stopIds: [...r.stopIds] })));
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

  const outstanding = jobs.filter((j) => j.status === 'pending' || j.status === 'in-transit');
  const done = jobs.filter((j) => j.status === 'delivered' || j.status === 'failed');

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
    .filter((j): j is Job => !!j && j.id !== currentId && j.status !== 'delivered');

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
    return { success: false, error: `Job ${id} not found` };
  }

  const expectedOtp = otpByJobId[id];
  if (!expectedOtp || otp !== expectedOtp) {
    return { success: false, error: 'Incorrect code. Ask the customer to confirm and try again.' };
  }

  const wasAlreadyDelivered = job.status === 'delivered';
  job.status = 'delivered';
  job.cashCollected = cashAmount;

  if (!wasAlreadyDelivered) {
    mockDriverStats = {
      ...mockDriverStats,
      delivered: mockDriverStats.delivered + 1,
      pending: Math.max(0, mockDriverStats.pending - 1),
      cashCollectedTotal: mockDriverStats.cashCollectedTotal + cashAmount,
    };
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
    return { success: false, error: `Job ${id} not found` };
  }

  const wasAlreadyDelivered = job.status === 'delivered';
  job.status = 'delivered';
  job.cashCollected = cashAmount;
  job.proofPhotoUri = photoUri;

  if (!wasAlreadyDelivered) {
    mockDriverStats = {
      ...mockDriverStats,
      delivered: mockDriverStats.delivered + 1,
      pending: Math.max(0, mockDriverStats.pending - 1),
      cashCollectedTotal: mockDriverStats.cashCollectedTotal + cashAmount,
    };
  }

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
    return { success: false, error: `Job ${id} not found` };
  }

  const wasAlreadyFailed = job.status === 'failed';
  job.status = 'failed';
  job.failureReason = reason;
  job.failureNote = note;

  if (!wasAlreadyFailed) {
    mockDriverStats = {
      ...mockDriverStats,
      failed: mockDriverStats.failed + 1,
      pending: Math.max(0, mockDriverStats.pending - 1),
    };
  }

  return { success: true, job: { ...job, packageInfo: { ...job.packageInfo } } };
}

export interface ScanResult {
  success: boolean;
  label?: string;
  error?: string;
}

/** Validates a scanned/typed barcode against known pickups and jobs. */
export async function confirmScan(code: string): Promise<ScanResult> {
  await delay(undefined);

  const trimmed = code.trim().toUpperCase();

  const pickup = mockPickups.find((p) => p.id.toUpperCase() === trimmed);
  if (pickup) {
    pickup.status = 'completed';
    return { success: true, label: pickup.businessName };
  }

  const job = mockJobs.find((j) => j.id.toUpperCase() === trimmed);
  if (job) {
    return { success: true, label: job.customerName };
  }

  return { success: false, error: 'Code not recognized. Try again or enter it manually.' };
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
