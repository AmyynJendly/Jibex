/**
 * The read-only runsheet endpoints, against a stand-in server shaped like
 * what jibex.cloud actually returned (field names and value kinds copied
 * from a real response; people and places anonymized).
 *
 * The account below has DIFFERENT user and driver ids on purpose: the real
 * test account has both at 3, so only a fixture like this one can catch the
 * runsheet endpoints being called with the wrong id.
 */

const mockKeychain = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  setItemAsync: async (key: string, value: string) => void mockKeychain.set(key, value),
  getItemAsync: async (key: string) => mockKeychain.get(key) ?? null,
  deleteItemAsync: async (key: string) => void mockKeychain.delete(key),
}));

type RealApi = typeof import('../services/real-api');

const USER_ID = 7;
const DRIVER_ID = 31;

function parcel(tracking: string, overrides: Record<string, unknown> = {}) {
  return {
    id: Number(tracking.replace(/\D/g, '')) || 1,
    trackingNumber: tracking,
    status: 'EN_COURS',
    recipientName: 'Client Test',
    recipientPhone: '20000000',
    recipientAddress: 'Rue Exemple 1',
    recipientCity: 'Tunis, Sidi Hassine',
    recipientLat: null,
    recipientLng: null,
    senderName: 'Boutique Test',
    senderPhone: '71000000',
    senderAgencyName: 'Agence Tunis',
    destinationAgency: null,
    description: 'Vêtements',
    weight: 1.5,
    type: 'FIX',
    price: 950,
    deliveryFee: 10,
    amountToCollect: 940,
    isPaid: false,
    pieces: null,
    fragile: null,
    lastScanLocation: 'Dépôt',
    lastScanTime: '2026-09-26T08:00:00',
    pickedUpAt: '2026-09-25T15:00:00',
    deliveredAt: null,
    deliveryLat: null,
    deliveryLng: null,
    deliveryPhotoUrl: null,
    deliverySignatureUrl: null,
    deliveryAttempts: 0,
    failureReason: null,
    failureNotes: null,
    returnType: null,
    createdAt: '2026-09-25T10:00:00',
    ...overrides,
  };
}

function item(id: number, seq: number, status: string, p: ReturnType<typeof parcel>, extra = {}) {
  return { id, sequenceOrder: seq, status, failureReason: null, notes: null, deliveredAt: null, scannedAt: '2026-09-26T07:00:00', parcel: p, ...extra };
}

const ACTIVE = [
  {
    id: 60,
    code: 'RS-20260926-0001',
    status: 'IN_PROGRESS',
    scheduledDate: '2026-09-26',
    totalParcels: 3,
    agency: { id: 1, name: 'Agence Tunis' },
    driver: { id: DRIVER_ID, fullName: 'Driver Test' },
    items: [
      // Listed out of order on purpose: sequenceOrder decides.
      item(502, 2, 'PENDING', parcel('TRK-00000502')),
      item(501, 1, 'PENDING', parcel('TRK-00000501')),
      item(503, 3, 'DELIVERED', parcel('TRK-00000503', { status: 'LIVRE_PAYE', price: 120, amountToCollect: 110 }), { deliveredAt: '2026-09-26T09:00:00' }),
      item(504, 4, 'FAILED', parcel('TRK-00000504', { status: 'RTN_DEPOT' }), { failureReason: 'NON_COMPLIANT_ORDER' }),
      item(505, 5, 'SOMETHING_NEW', parcel('TRK-00000505')),
    ],
  },
  { id: 61, code: 'RS-20260926-0002', status: 'CANCELLED', items: [] },
];

/** `GET /api/runsheets?driverId=` — every status, as the live server sends it. */
const ALL = [
  ACTIVE[0],
  {
    id: 54,
    code: 'RS-20260920-0001',
    status: 'COMPLETED',
    scheduledDate: '2026-09-20',
    completedAt: '2026-09-20T18:00:00',
    vehiclePlate: 'TUN-261',
    items: [
      item(401, 1, 'DELIVERED', parcel('TRK-00000401', { status: 'LIVRE_PAYE', amountToCollect: 50 })),
      item(402, 2, 'FAILED', parcel('TRK-00000402', { status: 'RTN_DEPOT' }), { failureReason: 'ABSENT' }),
      // Left pending on a closed run: neither delivered nor failed.
      item(403, 3, 'PENDING', parcel('TRK-00000403')),
    ],
  },
  {
    id: 47,
    code: 'RS-20260916-0001',
    status: 'COMPLETED',
    scheduledDate: '2026-09-16',
    completedAt: '2026-09-16T18:00:00',
    vehiclePlate: null,
    items: [item(301, 1, 'DELIVERED', parcel('TRK-00000301', { status: 'LIVRE_PAYE' }))],
  },
  { id: 26, code: 'RS-20260712-0001', status: 'CANCELLED', items: [item(201, 1, 'DELIVERED', parcel('TRK-00000201'))] },
];

let fetchMock: jest.Mock;
let urls: string[];

function json(status: number, body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
}

async function signedIn(): Promise<RealApi> {
  let api!: RealApi;
  jest.isolateModules(() => {
    api = require('../services/real-api');
  });
  fetchMock.mockImplementation((url: string) => {
    urls.push(url);
    if (url.endsWith('/api/auth/login')) {
      return json(200, {
        token: 't', role: 'DRIVER', portal: '/driver',
        user: { id: USER_ID, driverId: DRIVER_ID, username: 'driver', fullName: 'Driver Test', role: 'DRIVER', active: true },
      });
    }
    if (url.includes('/api/runsheets/driver/')) return json(200, ACTIVE);
    if (url.includes('/api/runsheets?driverId=')) return json(200, ALL);
    if (url.includes('/api/parcels/tracking/')) {
      return json(403, { timestamp: 'x', status: 403, error: 'Forbidden', message: 'Forbidden', path: '/api/parcels/tracking/x' });
    }
    return json(404, { error: 'not found' });
  });
  await api.login('driver', 'secret');
  urls.length = 0;
  return api;
}

beforeEach(() => {
  // The development-only [cash] log is for the Metro terminal, not test output.
  jest.spyOn(console, 'log').mockImplementation(() => {});
  mockKeychain.clear();
  (globalThis as unknown as { resetDeviceStorage: () => void }).resetDeviceStorage();
  fetchMock = jest.fn();
  urls = [];
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

describe('real runsheets', () => {
  it('asks for the DRIVER id’s runsheets, never the user account id', async () => {
    const api = await signedIn();
    await api.getRunsheets();
    expect(urls).toEqual([`https://jibex.cloud/api/runsheets/driver/${DRIVER_ID}/active`]);
  });

  it('maps the runsheet, leaving cancelled runs out', async () => {
    const api = await signedIn();
    const runsheets = await api.getRunsheets();
    expect(runsheets).toHaveLength(1);
    expect(runsheets[0]).toMatchObject({
      id: '60',
      code: 'RS-20260926-0001',
      status: 'EN_COURS',
      zone: 'Tunis',
      agency: 'Agence Tunis',
      stopCount: 5,
      deliveredCount: 1,
      needsConfirmation: false,
      stopIds: ['TRK-00000501', 'TRK-00000502', 'TRK-00000503', 'TRK-00000504', 'TRK-00000505'],
    });
  });

  it('takes amountToCollect as the cash, keeping price and the fee alongside', async () => {
    const api = await signedIn();
    const [first] = await api.getActiveParcels();
    expect(first.cashToCollect).toBe(940);
    expect(first.server).toMatchObject({ price: 950, amountToCollect: 940, deliveryFee: 10, itemId: '501', runsheetId: '60' });
  });

  it('works through dispatch’s order, delivered and failed parcels dropping out', async () => {
    const api = await signedIn();
    const active = (await api.getActiveParcels()).map((job) => job.id);
    expect(active).toEqual(['TRK-00000501', 'TRK-00000502', 'TRK-00000505']);
    const history = await api.getHistoryParcels();
    expect(history.slice(0, 2).map((job) => [job.id, job.status, job.failureReason])).toEqual([
      ['TRK-00000503', 'DELIVERED', undefined],
      ['TRK-00000504', 'FAILED', 'NON_COMPLIANT_ORDER'],
    ]);
  });

  it('adds parcels from runs the agency closed to history, newest run first', async () => {
    const api = await signedIn();
    const history = await api.getHistoryParcels();
    expect(urls).toContain(`https://jibex.cloud/api/runsheets?driverId=${DRIVER_ID}`);
    expect(history.map((job) => job.id)).toEqual([
      'TRK-00000503',
      'TRK-00000504',
      // Closed on the 20th, then the 16th. The parcel left pending on a
      // closed run and the cancelled run's parcel are in neither list.
      'TRK-00000401',
      'TRK-00000402',
      'TRK-00000301',
    ]);
    expect(history.find((job) => job.id === 'TRK-00000401')?.server?.runsheetStatus).toBe('COMPLETED');
  });

  it('lets a mistake be corrected only while its run is open', async () => {
    const api = await signedIn();
    const correctable = Object.fromEntries((await api.getHistoryParcels()).map((job) => [job.id, job.correctable]));
    // IN_PROGRESS run: correctable. Runs the agency closed: read-only.
    expect(correctable).toEqual({
      'TRK-00000503': true,
      'TRK-00000504': true,
      'TRK-00000401': false,
      'TRK-00000402': false,
      'TRK-00000301': false,
    });
  });

  it('works the Profile numbers out from real runs, and leaves out what it can’t know', async () => {
    const api = await signedIn();
    const stats = await api.getDriverStats();
    // Delivered: 503 (open run), 401 and 301 (closed runs). Failed: 504, 402.
    expect(stats.lifetimeDeliveries).toBe(3);
    expect(stats.deliveryRate).toBeCloseTo(60);
    // Cash on hand: delivered parcels on runs not yet closed — only 503.
    expect(stats.cashCollectedTotal).toBe(110);
    expect(stats.weeklyCashCollected).toBeUndefined();
    expect(stats.onPaceFinishTime).toBeUndefined();
  });

  it('shows the plate from the runs, or nothing when no run has one', async () => {
    const api = await signedIn();
    expect(await api.getVehicle()).toEqual({ plate: 'TUN-261' });
  });

  it('shows a status it doesn’t know as still to do, keeping the raw value', async () => {
    const api = await signedIn();
    const odd = (await api.getActiveParcels()).find((job) => job.id === 'TRK-00000505');
    expect(odd?.status).toBe('PENDING');
    expect(odd?.server?.itemStatus).toBe('SOMETHING_NEW');
  });

  it('has no map location when the server sends none', async () => {
    const api = await signedIn();
    const [first] = await api.getActiveParcels();
    expect(first.location).toBeUndefined();
  });

  it('lays the driver’s own drag order over dispatch’s', async () => {
    const api = await signedIn();
    await api.setStopOrder(['TRK-00000505', 'TRK-00000501', 'TRK-00000502']);
    await new Promise((resolve) => setTimeout(resolve, 3_100)); // past the shared-fetch window
    expect((await api.getActiveParcels()).map((job) => job.id)).toEqual([
      'TRK-00000505',
      'TRK-00000501',
      'TRK-00000502',
    ]);
  });

  it('finds the driver’s own parcel without the tracking endpoint, and reads its 403 as not found', async () => {
    const api = await signedIn();
    const own = await api.getJobDetail('trk-00000502');
    expect(own.id).toBe('TRK-00000502');
    expect(urls.some((url) => url.includes('/api/parcels/tracking/'))).toBe(false);

    await expect(api.getJobDetail('TRK-99999999')).rejects.toMatchObject({ status: 404 });
    expect(urls.some((url) => url.includes('/api/parcels/tracking/TRK-99999999'))).toBe(true);
  });
});
