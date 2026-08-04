import type {
  DriverStats,
  Job,
  Notification,
  Pickup,
  Return,
  Runsheet,
  Transfer,
  User,
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
  },
  {
    id: 'JBX-48214',
    customerName: 'Karim Mejri',
    address: 'Avenue Farhat Hached, Sfax',
    packageInfo: { count: 2, weightLbs: 5.1, fragile: false },
    status: 'pending',
    cashToCollect: 28.5,
  },
  {
    id: 'JBX-48215',
    customerName: 'Sarra Gharbi',
    address: 'Rue Ibn Khaldoun, Monastir',
    packageInfo: { count: 1, weightLbs: 1.2, fragile: false },
    status: 'pending',
    cashToCollect: 65.0,
  },
  {
    id: 'JBX-48216',
    customerName: 'Nizar Guesmi',
    address: 'Rue de Marseille, Sfax',
    packageInfo: { count: 3, weightLbs: 8.0, fragile: false },
    status: 'pending',
    cashToCollect: 15.0,
  },
  {
    id: 'JBX-48217',
    customerName: 'Rania Cherif',
    address: 'Avenue de la République, Monastir',
    packageInfo: { count: 1, weightLbs: 0.8, fragile: true, note: 'Ring twice' },
    status: 'failed',
    cashToCollect: 22.0,
  },
  {
    id: 'JBX-48218',
    customerName: 'Walid Ammar',
    address: 'Zone Industrielle, Sfax',
    packageInfo: { count: 4, weightLbs: 12.5, fragile: false },
    status: 'failed',
    cashToCollect: 0,
  },
  {
    id: 'JBX-48219',
    customerName: 'Ines Trabelsi',
    address: 'Boulevard 14 Janvier, Sousse',
    packageInfo: { count: 1, weightLbs: 3.0, fragile: false },
    status: 'delivered',
    cashToCollect: 55.0,
    cashCollected: 55.0,
  },
  {
    id: 'JBX-48220',
    customerName: 'Yassine Trabelsi',
    address: 'Avenue Habib Bourguiba, Tunis',
    packageInfo: { count: 1, weightLbs: 1.5, fragile: false },
    status: 'delivered',
    cashToCollect: 30.0,
    cashCollected: 30.0,
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

const mockUser: User = {
  id: 'u1',
  name: 'Marcus Alden',
  // Digits only — a real backend normalizes phone input the same way before
  // comparing, and this keeps the value fully typeable on a phone-pad keyboard.
  username: '21620456789',
  avatarInitials: 'MA',
};

/** Dev-only mock credentials — irrelevant once login() calls a real API. */
const mockPassword = 'password123';

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

export async function getJobDetail(id: string): Promise<Job> {
  await delay(undefined);

  const job = mockJobs.find((j) => j.id === id);
  if (!job) {
    throw new Error(`Job ${id} not found`);
  }
  return { ...job, packageInfo: { ...job.packageInfo } };
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
