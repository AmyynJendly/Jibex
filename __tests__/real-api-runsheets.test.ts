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
    expect(history.map((job) => [job.id, job.status, job.failureReason])).toEqual([
      ['TRK-00000503', 'DELIVERED', undefined],
      ['TRK-00000504', 'FAILED', 'NON_COMPLIANT_ORDER'],
    ]);
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
